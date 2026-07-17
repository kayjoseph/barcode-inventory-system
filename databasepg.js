const {Client} = require('pg')

const client = new Client({
    host: "localhost",
    user: "postgres",
    port: 5432,
    password: "root",
    database: "users"
})

client.connect();

client.query(`SELECT current_database()`, (err, res) => {
    if(!err){
        console.log("Connected to database:", res.rows);
    } else {
        console.log("Error checking database:", err.message);
    }
});

client.query(`SELECT table_schema, table_name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema')`, (err, res) => {
    if(!err){
        console.log("Tables found:", res.rows);
    } else {
        console.log("Error listing tables:", err.message);
    }
});

client.query(`select * from users`, (err, res) => {
    if(!err){
        console.log("Users data:", res.rows);
    } else {
        console.log("Error querying users:", err.message);
    }
    client.end();
})