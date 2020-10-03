const http = require('http');
const express = require("express");
const path = require("path");
const reload = require('reload');
const fs = require('fs');


const app = express();
// app.listen(4747, () => {
//   console.log("Server started on: http://localhost:4747/");
// });

const static_dir = path.join(__dirname, "static");
app.use(express.static(static_dir));
app.set('port', 4747);
app.get("/", (req, res) => {
    res.render("index");
});




const server = http.createServer(app);

// Reload code here
reload(app).then(function (reloadReturned) {
  // reloadReturned is documented in the returns API in the README

  // watch.watchTree(static_dir, function (f, curr, prev) {
  fs.watch(static_dir, (e) => {
    // Fire server-side reload event
    console.log('reload HTML because of ', e)
    reloadReturned.reload();
  });
  // Reload started, start web server
  server.listen(app.get('port'), function () {
    console.log('Web server listening on port ' + app.get('port'))
  })
}).catch(function (err) {
  console.error('Reload could not start, could not start server/sample app', err)
})








// console.log('hi')
// const startServer = async () => {
//     const reloadReturned = await reload(app);

//     watch.watchTree(static_dir, (f, curr, prev) => {
//         // Fire server-side reload event
//         reloadReturned.reload();
//         console.log('html reload.')
//     })
// }
// startServer();
// const server = http.createServer(app)
// reload(app).then(function (reloadReturned) {
//   // reloadReturned is documented in the returns API in the README

//   // Reload started, start web server
//   server.listen(app.get('port'), function () {
//     console.log('Web server listening on port ' + app.get('port'))
//   })
// }).catch(function (err) {
//   console.error('Reload could not start, could not start server/sample app', err)
// })
