const {Pool} = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString : process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL,
});

pool.connect((err, client)=> {
if(err){
    console.log('Database connection failed !!!',err.stack);
}else{
    client.release();
    console.log('Database connected successfully');
}
});

module.exports = pool;