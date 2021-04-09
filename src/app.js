const express = require('express');
const app = express();
const server = require('http').createServer(app);
const path = require('path')
const cors =  require('cors')
const WebSocketServer = require('ws')
const session = require('express-session')
const flash = require('connect-flash')
const passport = require('passport')
const {isLoggedIn} = require('./middleware/auth')

const PubSub = require('./public/js/pubsub')
const User = require('./models/User');
const Post = require('./models/Post');
const { RSA_NO_PADDING } = require('constants');
require('./database')
require('./config/passport')

app.use(cors({
    exposedHeaders: '*',
  }))
app.set("view engine","ejs");
//static files
app.use(express.static(path.join(__dirname , 'views')));// indicando donde buscaremos los archivos que necesitara el servidor
app.set('views',path.join(__dirname+'/views'))// monstrandole donde buscar las vistas

//config



//middlewares
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(session({
  secret:'mysecret',
  resave:'true',
  saveUninitialized:'true'
}));
app.use(passport.initialize())
app.use(passport.session())
app.use(flash())

//Global variables de app
app.use((req, res, next)=>{
  res.locals.success_msg = req.flash('success_msg')
  res.locals.error_msg = req.flash('error_msg')
  res.locals.error = req.flash('error')
  res.locals.success = req.flash('success')
  res.locals.user = req.user || null
 
  //crear una variable que pase a true cuando se ejecute esta funcion, para que solo se ejecute una vez
  //console.log(res.locals)
  next();
})

//routes
//index
app.get("/", function(req, res){
  
 // if(res.locals.user && res.locals.user.topics){
   //res.locals.user.topics.forEach((topic)=>{
    //  console.log(res.locals.user._id)
      //app.pubsub.handleReceivedClientMessage(res.locals.user._id,{
       // action: 'subscribe',
        //payload: {
         // topic: topic,
        //},
     // })
   
  
   // })
// }
    res.render("principal/no_autenticado");
})

app.get("/hidden",isLoggedIn, function(req, res){
    res.render("index");
})

//principal views
app.get("/autenticado", function(req, res){
  res.render("principal/autenticado")
})

app.get("/publicador", function(req, res){
  res.render("principal/publicador")
})

app.get("/p", function(req, res){
  let user = res.locals.user
  let topicos = user.topics
  var objeto = []
  let post_finales

  if(res.locals.user && res.locals.user.role === "publish"){
    res.render("principal/publicador",{ id: user.username})
  }
 
  else {
  topicos.forEach((element) => {
    objeto.push({topic : element});
    console.log("resultado de" , objeto)
  });
  
   Post.find({ $or : objeto}, function (err, posts){
      if (err){
      console.log(err);
     }
    else{
      if(res.locals.user && res.locals.user.role === "reader"){
        res.render("principal/autenticado",{ id: user.username , posts: posts})
      }
      post_finales =  posts
     } 
   })
  }
  
})

//auth
  //login
app.get("/login", function(req, res){
  res.render("authentication/login")
})
app.post("/login",passport.authenticate('local',{
  successRedirect: '/p',
  failureRedirect: '/login',
  failureFlash: true,
  successFlash: 'Welcome'
}),
)
app.get('/logout', (req, res)=>{
  req.logout();
  res.redirect('/')
})
app.get('/data', function(req, res){
  //console.log(res.locals)
  res.json(res.locals.user)
})


  //register
app.get("/register", function(req, res){
  res.render("authentication/register", {error:false})
})

app.post("/register", async(req, res)=>{
  const {username, password, role, topics} = req.body
  console.log(req.body)
  const error=[];
  if(!username){
    error.push({text: 'Please write a username'})
  }
  if(!password){
    error.push({text: 'Please write a password'})
  }
  if(error.length > 0){
      res.render("authentication/register",{
      error, username, password
    })
  }else{
    const newUser = new User({username, password, role, topics});
    await newUser.save();
    req.flash('success_msg', 'User Register Successfully');
    passport.authenticate("local")(req, res, function(){
			res.redirect("/p")
		})
  }
})

//publicador
/*app.post("/publicador", function(req, res){

 // console.log("hello")

 // console.log(req.user._id)
 // console.log(req.body) 
  message = JSON.stringify(req.body)

  app.pubsub.handleReceivedClientMessage(req.user._id,{
    action: 'publish',
    payload: {   
    topic: req.body.topic,
    message: message,
  },

 
})
res.redirect("/publicador")

})*/

app.put("/modificar/:id", function(req, res){
  var ajaxData = req.body
  console.log(req.body)
  User.findById(req.params.id ,(error, user)=>{

    if (ajaxData.action === "agregar")
    user.topics.push(ajaxData.topic);
    else{
    var newTopics = user.topics.filter((item)=>{
      return item != ajaxData.topic 
      })
     user.topics = newTopics
  
     }
  user.save();
    
  })

})


// crear una noticia
app.post("/noticia", function(req, res){
  const post = new Post(req.body);
  console.log("app.js" , req.body)
  post.save()
})

//obtener noticias segun el topico
app.get("/getpost", function(req, res){

 
  

 
})


const wss = new WebSocketServer.Server({
    server: server,
  })

const pubSubServer = new PubSub({wss: wss})
app.pubsub = pubSubServer


server.listen(3000, ()=>{
    console.log("servidor activo!!")
});


