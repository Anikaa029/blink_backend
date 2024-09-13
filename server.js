import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2';
import XLSX from 'xlsx'
import readRoutineDataFromExcelByBatch from './readFile.js'

const app = express();
const port = 3001;

const db = new sqlite3.Database('test_1.db');

const db_mysql = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: 'ete'
});


db_mysql.connect(err => {
  if (err) {
    console.error('Error connecting to MySQL', err.message);
  } else {
    console.log('MySQL connected...');
    db_mysql.query(
      `CREATE TABLE IF NOT EXISTS users_new (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
      )`,
      err => {
        if (err) {
          console.error('Error creating table', err.message);
        }
      }
    );
  }
});

db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS batches (id INTEGER PRIMARY KEY AUTOINCREMENT, batch TEXT UNIQUE, start_date TEXT, level_term TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS off_days_new (id INTEGER PRIMARY KEY AUTOINCREMENT, batch TEXT UNIQUE, dates TEXT)');

  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      console.error(err);
    } else {
      console.log('Tables:', tables);
    }
  });
  
  db.all("SELECT * FROM batches", (err, data) => {
    if (err) {
      console.error(err);
    } else {
      console.log('Data of batches:', data);
    }
  });

    
  // db.all("DROP TABLE batches", (err, data) => {
  //   if (err) {
  //     console.error(err);
  //   } else {
  //     console.log('off_days_new dropped', data);
  //   }
  // });
  
});

app.use(cors());
app.use(bodyParser.json());

// app.post('/batches', (req, res) => {
//   const { batch, startDate, levelTerm } = req.body;

//   db.run('INSERT OR REPLACE INTO batches (batch, start_date, level_term) VALUES (?, ?, ?)', [batch, startDate, levelTerm], function (error) {
//     if (error) {
//       console.error(error);
//       res.status(500).json({ error: 'Error saving or updating batch.' });
//       return;
//     }

//     if (this.changes === 1) {
//       const id = this.lastID || 'N/A';
//       res.status(201).json({ message: 'Batch saved or updated successfully.', id });
//     } else {
//       res.status(200).json({ message: 'Batch start date updated successfully.' });
//     }
//   });
// });
app.post('/batches', (req, res) => {
  const { batch, startDate, levelTerm } = req.body;

  // Input validation
  if (!batch || !startDate || !levelTerm) {
    res.status(400).json({ error: 'Batch, startDate, and levelTerm are required.' });
    return;
  }

  db.get('SELECT batch FROM batches WHERE batch = ?', [batch], (err, row) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Error querying the database.' });
      return;
    }

    if (row) {
      // Record exists, update it
      db.run('UPDATE batches SET start_date = ?, level_term = ? WHERE batch = ?', [startDate, levelTerm, batch], function (updateErr) {
        if (updateErr) {
          console.error(updateErr);
          res.status(500).json({ error: 'Error updating the batch.' });
          return;
        }

        res.status(200).json({ message: 'Batch updated successfully.' });
      });
    } else {
      // Record does not exist, insert a new one
      db.run('INSERT INTO batches (batch, start_date, level_term) VALUES (?, ?, ?)', [batch, startDate, levelTerm], function (insertErr) {
        if (insertErr) {
          console.error(insertErr);
          res.status(500).json({ error: 'Error inserting the new batch.' });
          return;
        }

        // const id = this.lastID || 'N/A';
        res.status(201).json({ message: 'Batch created successfully.' });
      });
    }
  });
});

app.get('/batches', (req, res) => {
  const query = 'SELECT * FROM batches';

  db.all(query, (error, rows) => {
    if (error) {
      console.error(error);
      res.status(500).json({ error: 'Error fetching batches.' });
      return;
    }

    res.status(200).json(rows);
  });
});


// console.log(readRoutineDataFromExcelByBatch())
app.get('/routine-data', (req, res) => {
  const data = readRoutineDataFromExcelByBatch();
  res.json(data);
});


// app.post('/save-off-days', (req, res) => {
//   const { startDate, endDate } = req.body;
//   const start = new Date(startDate);
//   const end = new Date(endDate);

//   if (start > end) {
//     return res.status(400).send('Invalid date range');
//   }
//   console.log(startDate,endDate)
//   const dates = [];
//   for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
//     dates.push([new Date(dt).toISOString().slice(0, 10)]);
//   }

//   const placeholders = dates.map(() => '(?)').join(',');
//   const query = `INSERT OR IGNORE INTO off_days_new (dates) VALUES ${placeholders}`;
//   console.log("dates", dates)
//   db.run(query, dates.flat(), function (error) {
//     if (error) {
//       console.error(error);
//       res.status(500).send('Error saving off days');
//       return;
//     }
//     res.status(200).send('Off days saved successfully');
//   });
// });


// app.post('/save-off-days', (req, res) => {
//   const { startDate, endDate, batch } = req.body;
//   const start = new Date(startDate);
//   const end = new Date(endDate);

//   if (start > end) {
//     return res.status(400).send('Invalid date range');
//   }
//   console.log(startDate,endDate, batch)
//   const dates = [];
//   for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
//     dates.push([new Date(dt).toISOString().slice(0, 10)]);
//   }

//   const placeholders = dates.map(() => '(?)').join(',');
//   const query = `INSERT OR IGNORE INTO off_days_new (batch, dates) VALUES ${batch, placeholders}`;
//   console.log("dates", dates)

//   db.run(query, dates.flat(), function (error) {
//     if (error) {
//       console.error(error);
//       res.status(500).send('Error saving off days');
//       return;
//     }
//     res.status(200).send('Off days saved successfully');
//   });
// });


app.post('/save-off-days', (req, res) => {
  const { startDate, endDate, batch } = req.body;
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    return res.status(400).send('Invalid date range');
  }

  const newDates = [];
  for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    newDates.push(new Date(dt).toISOString().slice(0, 10));
  }

  const selectQuery = 'SELECT dates FROM off_days_new WHERE batch = ?';
  db.get(selectQuery, [batch], (selectError, row) => {
    if (selectError) {
      console.error(selectError);
      return res.status(500).send('Error retrieving existing off days');
    }

    let existingDates = [];
    if (row && row.dates) {
      existingDates = JSON.parse(row.dates);
    }

    const allDatesSet = new Set([...existingDates, ...newDates]);
    const allDates = Array.from(allDatesSet);
    const datesJson = JSON.stringify(allDates);

    const insertQuery = 'INSERT OR REPLACE INTO off_days_new (batch, dates) VALUES (?, ?)';
    db.run(insertQuery, [batch, datesJson], function (insertError) {
      if (insertError) {
        console.error(insertError);
        return res.status(500).send('Error saving off days');
      }
      res.status(200).send('Off days saved successfully');
    });
  });
});






app.get('/get-all-off-days', (req, res) => {
  const query = 'SELECT batch, dates FROM off_days_new';

  db.all(query, [], (error, rows) => {
    if (error) {
      console.error(error);
      return res.status(500).send('Error retrieving off days');
    }

    const result = rows.map(row => ({
      batch: row.batch,
      dates: JSON.parse(row.dates)
    }));

    res.status(200).json(result);
  });
});



app.post('/get-off-days', (req, res) => {
  const { batch } = req.body;

  if (!batch) {
    return res.status(400).send('Batch is required');
  }

  const query = 'SELECT dates FROM off_days_new WHERE batch = ?';
  db.get(query, [batch], (error, row) => {
    if (error) {
      console.error(error);
      return res.status(500).send('Error retrieving off days');
    }
    if (!row) {
      return res.status(200).json([]);
    }
    
    const dates = JSON.parse(row.dates);
    res.status(200).json(dates);
  });
});




// app.delete('/reset-off-days', (req, res) => {
//   db.run('DELETE FROM off_days_new', function (error) {
//     if (error) {
//       console.error(error);
//       res.status(500).send('Error resetting off days');
//       return;
//     }
//     res.status(200).send('Off days reset successfully');
//   });
// });

app.delete('/reset-off-days', (req, res) => {
  const { batch } = req.body;
  console.log("reset batch", batch)

  if (!batch) {
    return res.status(400).send('Batch is required');
  }

  const query = `DELETE FROM off_days_new WHERE batch = ?`;
  db.run(query, [batch], function (error) {
    if (error) {
      console.error(error);
      res.status(500).send('Error resetting off days');
      return;
    }
    res.status(200).send('Off days reset successfully');
  });
});



app.delete('/reset-off-days-for-specific-dates', (req, res) => {
  const { batch, datesToDelete } = req.body;

  if (!batch || !datesToDelete || !Array.isArray(datesToDelete)) {
    return res.status(400).send('Batch and datesToDelete array are required');
  }

  const selectQuery = `SELECT dates FROM off_days_new WHERE batch = ?`;

  db.get(selectQuery, [batch], (error, row) => {
    if (error) {
      console.error(error);
      return res.status(500).send('Error retrieving off days');
    }

    if (!row) {
      return res.status(404).send('Batch not found');
    }

    const currentDates = JSON.parse(row.dates);
    const updatedDates = currentDates.filter(date => !datesToDelete.includes(date));
    const updatedDatesJson = JSON.stringify(updatedDates);

    const updateQuery = `UPDATE off_days_new SET dates = ? WHERE batch = ?`;

    db.run(updateQuery, [updatedDatesJson, batch], function (error) {
      if (error) {
        console.error(error);
        return res.status(500).send('Error resetting off days');
      }
      res.status(200).send('Off days reset successfully');
    });
  });
});


app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  
  db_mysql.query('SELECT * FROM users_new WHERE username = ? OR email = ?', [username, email], async (err, results) => {
    if (err) {
      return res.status(500).send(err.message);
    }
    if (results.length > 0) {
      if (results.some(user => user.username === username)) {
        return res.status(400).send('Username already exists');
      }
      if (results.some(user => user.email === email)) {
        return res.status(400).send('Email already exists');
      }
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    db_mysql.query(
      'INSERT INTO users_new (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      (err) => {
        if (err) {
          return res.status(500).send(err.message);
        }
        res.status(201).send('User registered');
      }
    );
  });
});


app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db_mysql.query('SELECT * FROM users_new WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).send(err);
    if (results.length === 0) return res.status(404).send('User not found');
    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send('Invalid credentials');
    const token = jwt.sign({ id: user.id }, 'secretkey', { expiresIn: '1h' });
    res.status(200).json({ token, user: { id: user.id, email: user.email } });
  });
});
 

 const readMasterRoutine = () => {
  try {
    const filePath = './routine.xlsx';
    console.log('Reading file from: ${filePath}');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const routine = {};
    data.forEach(row => {
      const day = row.Day.toLowerCase();
      if (!routine[day]) {
        routine[day] = [];
      }
      const startTime = String(row['Start Time']).replace('.', ':');
      const endTime = String(row['End Time']).replace('.', ':');
      routine[day].push({
        batch: row.Batch,
        startTime,
        endTime,
        class: row.Class
      });
    });
    console.log('Excel data successfully parsed:', routine);
    return routine;
  } catch (error) {
    console.error('Error reading Excel file:', error);
    throw error;
  }
};


app.get('/routine', (req, res) => {
  try {
    const routine = readMasterRoutine();
    res.json(routine);
  } catch (error) {
    console.error('Error in /routine endpoint:', error);
    res.status(500).send('Error reading Excel file');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
