const express = require('express');
const bodyparser = require('body-parser');
const mariadb = require('mysql');
const favicon = require('serve-favicon');
const logger = require('morgan');
const fs = require('fs');
const path = require('path');
const rfs = require('rotating-file-stream');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const mysub = require('./mysub.js');

//express 설정
var app = express();
app.use(express.static('published')); // static파일 경로설정
// 끝.

// 쿠키정보
app.use(cookieParser());

// logger 설정 //// create a write stream (in append mode)// setup the logger
var logDirectory = path.join(__dirname, 'log');
// ensure log directory exists
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

// create a rotating write stream
var accessLogStream = rfs('access.log', {
  interval: '1d', // rotate daily
  path: logDirectory
});

// setup the logger
app.use(logger('combined', { stream: accessLogStream }));


// parse application/x-www-form-urlencoded
app.use(bodyparser.urlencoded({ extended: false }));
// 끝

// jade설정
app.set('view engine', 'jade'); //확장자 jade
app.set('views', './views'); // views에서 찾음
app.locals.pretty = true; /** jade 소스이쁘게 배포판엔 "false"**/
// 끝.

// bodyParser설정
app.use(bodyparser.urlencoded({
  extended: false
})); /** POST 방식 인수 전달 미들웨어*/
//끝.

// mariadb 설정
var connection = mariadb.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'webuser',
  password: '111111',
  database: 'drweb'
});
connection.connect();
// 끝.

// 라우팅시작
// get방식 
app.get(['/', '/:node', '/:node/:id', '/:node/:id/:cmd', '*'], (req, res) => {
  var sql = 'SELECT * FROM topic ';
  connection.query(sql, (err, resultTOPIC) => {
    if (err) { console.log(err); throw err; };
    // node라우팅시작
    var node = req.params.node;
    switch (node) {
      case undefined:
        res.redirect('/topic');
        break;
      case 'topic':
        // topic >> id 라우팅 시작 
        var id = req.params.id;
        switch (id) {
          case undefined:
            res.render('view', { topics: resultTOPIC, topic: { title: 'Welcome', description: 'Javascript ' } });
            break;
          case 'add':
            res.render('add', { topics: resultTOPIC })
            break;
          default:
            // cmd라우팅
            var cmd = req.params.cmd;
            switch (cmd) {
              case undefined:
                var sql = 'SELECT * FROM topic where id=?';
                connection.query(sql, [id], (err, result) => {
                  if (err) { console.log(err); throw err; };
                  if (result.length > 0)
                    res.render('view', { topics: resultTOPIC, topic: { topicid: id, title: result[0].title, description: result[0].description, author: result[0].author } });
                  else
                    res.redirect('/topic');
                });
                break;
              case 'delete':
                var sql = 'SELECT * FROM topic where id=?';
                connection.query(sql, [id], (err, result) => {
                  if (err) { console.log(err); throw err; };
                  if (result.length > 0)
                    res.render('delete', { topics: resultTOPIC, topic: { topicid: id, title: result[0].title, description: result[0].description, author: result[0].author } });
                  else
                    res.redirect('/topic');
                });
                break;
              case 'edit':
                var sql = 'SELECT * FROM topic where id=?';
                connection.query(sql, [id], (err, result) => {
                  if (err) { console.log(err); throw err; };
                  if (result.length > 0)
                    res.render('edit', { topics: resultTOPIC, topic: { topicid: id, title: result[0].title, description: result[0].description, author: result[0].author } });
                  else
                    res.redirect('/topic');
                });
                break;
              default:
                console.log(`${node}>>${id}>>${cmd}`);
                res.send(`<h1>${node}>>${id}>>${cmd}</h1>`);
                break;
            }; // switch cmd 라우팅끝
            break;
        };//switch id 라우팅 끝
        break;
      default:
        break;
    };// switch node 라우팅끝
  });
});


app.post('/posting/:cmd', (req, res) => {
  var cmd = req.params.cmd;
  switch (cmd) {
    case 'add':
      var sql = 'INSERT INTO topic (title,description,author) VALUES (?,?,?)';
      connection.query(sql, [req.body.title, req.body.description, req.body.author], (err, result) => {
        if (err) { console.log(err); throw err; };
        // console.log(result);
        res.redirect('/topic/' + result.insertId);
      });
      break;
    case 'edit':
      var sql = 'UPDATE topic SET title=?, description=?, author=? WHERE id=?';
      connection.query(sql, [req.body.title, req.body.description, req.body.author, req.body.id], (err, result) => {
        if (err) { console.log(err); throw err; };
        // console.log(result);
        res.redirect('/topic/' + req.body.id);
      });
      break;
    case 'delete':
      var sql = 'DELETE FROM topic WHERE id=?';
      connection.query(sql, [req.body.id], (err, result) => {
        if (err) { console.log(err); throw err; };
        // console.log(result);
        res.redirect('/topic');
      });
      break;
    default:
      break;
  };

});


// 웹서버 리스닝 시작
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Dr Web listening PORT ${mysub.getIPAddress()}:${PORT}`)
});