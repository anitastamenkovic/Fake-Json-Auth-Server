// Create server and db
const fs = require("fs");
const bodyParser = require("body-parser");
const jsonServer = require("json-server");
const jwt = require("jsonwebtoken");

const server = jsonServer.create();
let userDB = JSON.parse(fs.readFileSync("./users.json", "utf-8"));
let todos = JSON.parse(fs.readFileSync("./todo.json", "utf-8"));

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(jsonServer.defaults());

// Create tokens
const SECRET_KEY = "sdlkrmbt0w9m8bm45wmu802";
const SECRET_KEY_REFRESH = "wserbtwaemrtbpaswemrbtba";

const expiresIn = "1h";
const expiresInRefresh = "1d";

function createToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

function createRefreshToken(payload) {
  return jwt.sign(payload, SECRET_KEY_REFRESH, { expiresIn: expiresInRefresh });
}

// Login Auth
function isLoginAuthenticated({ email, password }) {
  /* return (
    userDB.users.findIndex(
      (user) => user.email === email && user.password === password
    ) !== -1
  ); */
  for (let i = 0; i < userDB.users.length; i++) {
    const user = userDB.users[i];
    if (user.email != email) continue;
    if (user.password != password) continue;
    return true;
  }
  console.log("User Not Found. Email ", email, " Pwd: ", password);
  return false;
}

// Register Auth
function isRegisterAuthenticated({ email }) {
  return userDB.users.findIndex((user) => user.email === email) !== -1;
}

// Is tokens ok?
function isRefreshTokenOK({ refresh_token }) {
  try {
    var decoded = jwt.verify(refresh_token, SECRET_KEY_REFRESH);
    console.log("decoded = ", decoded);

    if (isLoginAuthenticated(decoded)) {
      console.log("isLoginAuthenticated == true");
      return true;
    } else {
      console.log(
        "isLoginAuthenticated == false",
        decoded.email,
        decoded.password
      );
      return false;
    }
  } catch (err) {
    console.error(err);
    return false;
  }
}

function isTokenOK({ access_token }) {
  try {
    var decoded = jwt.verify(access_token, SECRET_KEY);
    console.log("decoded = ", decoded);

    if (isLoginAuthenticated(decoded)) {
      console.log("isLoginAuthenticated == true");
      return true;
    } else {
      console.log(
        "isLoginAuthenticated == false",
        decoded.email,
        decoded.password
      );
      return false;
    }
  } catch (err) {
    console.error(err);
    return false;
  }
}

// Create new tokens with refresh token
server.get("/refresh", (req, res) => {
  const refresh_token = req.query.refresh_token;
  if (isRefreshTokenOK({ refresh_token }) == false) {
    const status = 401;
    const message = "Token is wrong!";
    res.status(status).json({ status, message });
    return;
  }
  var decoded = jwt.verify(refresh_token, SECRET_KEY_REFRESH);
  const user = {
    email: decoded.email,
    password: decoded.password,
  };
  const new_access_token = createToken(user);
  const new_refresh_token = createRefreshToken(user);
  res.jsonp({ new_access_token, new_refresh_token });
});

// Todos for checking is auth is working
server.get("/todos", (req, res) => {
  const access_token = req.query.access_token;
  if (isTokenOK({ access_token }) == false) {
    const status = 401;
    const message = "Token is wrong!";
    res.status(status).json({ status, message });
    return;
  }
  res.jsonp(todos);
});

server.post("/todos", (req, res) => {
  const { title, description } = req.body;
  if (isTokenOK({ access_token })) {
    const status = 401;
    const message = "Token is wrong!";
    res.status(status).json({ status, message });
    return;
  }

  fs.readFile("./todo.json", (err, data) => {
    if (err) {
      const status = 401;
      const message = err;
      res.status(status).json({ status, message });
      return;
    }
    data = JSON.parse(data.toString());

    let last_item_id = data.users[data.users.length - 1].id;

    data.todos.push({
      id: last_item_id + 1,
      title: title,
      description: description,
    });
    todos = data;
    let writeData = fs.writeFile(
      "./todo.json",
      JSON.stringify(data),
      (err, result) => {
        if (err) {
          const status = 401;
          const message = err;
          res.status(status).json({ status, message });
          return;
        }
      }
    );
  });

  res.status(200);
});

// Register
server.post("/register", (req, res) => {
  const { name, surname, email, password } = req.body;
  if (isRegisterAuthenticated({ email })) {
    const status = 401;
    const message = "Email already exist";
    res.status(status).json({ status, message });
    return;
  }

  fs.readFile("./users.json", (err, data) => {
    if (err) {
      const status = 401;
      const message = err;
      res.status(status).json({ status, message });
      return;
    }
    data = JSON.parse(data.toString());

    let last_item_id = data.users[data.users.length - 1].id;

    data.users.push({
      id: last_item_id + 1,
      name: name,
      surname: surname,
      email: email,
      password: password,
    });
    userDB = data;
    let writeData = fs.writeFile(
      "./users.json",
      JSON.stringify(data),
      (err, result) => {
        if (err) {
          const status = 401;
          const message = err;
          res.status(status).json({ status, message });
          return;
        }
      }
    );
  });
  const access_token = createToken({ email, password });
  const refresh_token = createRefreshToken({ email, password });
  res.status(200).json({ access_token, refresh_token });
});

// Login
server.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!isLoginAuthenticated({ email, password })) {
    const status = 401;
    const message = "Incorrect Email or Password";
    res.status(status).json({ status, message });
    return;
  }
  const access_token = createToken({ email, password });
  const refresh_token = createRefreshToken({ email, password });
  console.log("access_token", access_token);
  console.log("refresh_token", refresh_token);
  res.status(200).json({ access_token, refresh_token });
});

// Listening for server
server.listen(5000, () => {
  console.log("Running fake api json server");
});

// Get new tokens
// http://localhost:5000/refresh?refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFhYSIsInBhc3N3b3JkIjoiYWFhIiwiaWF0IjoxNjM2ODc2OTY5LCJleHAiOjE2MzY5NjMzNjl9.hBHMAh1ygr555wc6PRCmDsM8Uka_fqoBUKbyJlagU9A

// Get todos
// http://localhost:5000/todos?access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFhYSIsInBhc3N3b3JkIjoiYWFhIiwiaWF0IjoxNjM2ODk4OTAxLCJleHAiOjE2MzY5MDI1MDF9.Fe9_Q9dUjmmw7Awfhzgq-zKSqWQ5O3vwpo54uH0beFs
