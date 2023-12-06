const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const mysql = require('mysql');

const app = express();
const port = 3000;

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'movie_db',
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
  } else {
    console.log('Connected to MySQL');
  }
});

//route
app.post('/', async (req, res) => {
  const searchQuery = req.body.searchQuery;

  try {
    const omdbResponse = await axios.get(`http://www.omdbapi.com/?s=${searchQuery}&apikey=8eb791e4`);
    console.log(omdbResponse);

    const movies = omdbResponse.data.Search || [];

    const html = generateHtmlForSearchResults(movies);

    res.send(html);

    return;
  } catch (error) {
    console.error('Error fetching data from OMDB API:', error.message);
    res.status(500).send('Internal Server Error');
    return;
  }
});


function generateHtmlForSearchResults(movies) {
  return movies.map(movie => `
    <div class="row mt-4">
      <div class="col-md-2 mt-1 offset-md-2">
        <img src="${movie.Poster}" alt="${movie.Title} Poster" id="poster-image">
      </div>
      <div class="col-md-6 mt-3">
        <h3>${movie.Title}</h3>
        <p><b>Year:</b> ${movie.Year}</p>
        <p><b>Type:</b> ${movie.Type}</p>
        <div class="form-check form-switch">
          <input type="checkbox" class="form-check-input" role="switch" id="favoriteCheckbox_${movie.imdbID}" onclick="saveFavorite('${movie.imdbID}', '${movie.Title}', '${movie.Year}', '${movie.Type}', '${movie.Poster}')">
          <label class="form-check-label text-success" for="favoriteCheckbox_${movie.imdbID}"><b>Add to Favorites</b></label>
        </div>
      </div>
      <div class="position-fixed top-0 end-0 p-3" style="width:250px;text-align:center;">
        <div id="messageBox_${movie.imdbID}" class="alert d-none" role="alert"></div>
      </div>
    </div>
  `).join('');
}


//route
app.get('/OmdbProject/favorites', (req, res) => {
  // Retrieve favorites from the database
  db.query('SELECT * FROM favorites', (err, results) => {
    if (err) {
      console.error('Error fetching favorites:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      const html = generateHtmlForFavorites(results);
      res.send(html);
    }
  });
});

app.post('/OmdbProject/favorite', (req, res) => {
  const { title, year, type, poster } = req.body;

  // Add the favorite to the database
  db.query(
    'INSERT INTO favorites (title, year, type, poster) VALUES (?, ?, ?, ?)',
    [title, year, type, poster],
    (err) => {
      if (err) {
        console.error('Error saving favorite:', err.message);
        res.status(500).send('Internal Server Error');
      } else {
        res.status(200).send('Added to favorites');
      }
    }
  );
});

// route
app.post('/OmdbProject/unfavorite', (req, res) => {
  const { title } = req.body;

  // Remove the favorite from the database
  db.query('DELETE FROM favorites WHERE title = ?', [title], (err) => {
    if (err) {
      console.error('Error removing favorite:', err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.status(200).send('Removed from Favorites');
    }
  });
});



function generateHtmlForFavorites(favorites) {
  if (favorites.length === 0) {
    return `<div id="noFavoritesMessage" class="alert">
    No favorites found. Add some favorites to see them here.
  </div>`;
  }

  return favorites.map(favorite => `
      <div class="row mt-4" >
  <div class="col-md-2 mt-1">
    <img src="${favorite.poster}" alt="${favorite.title} Poster" id="poster-image">
  </div>
  <div class="col-md-6 mt-3">
    <h3>${favorite.title}</h3>
    <p><b>Year:</b> ${favorite.year}</p>
    <p><b>Type:</b> ${favorite.type}</p>
  </div>
</div >
      `).join('');
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
