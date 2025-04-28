   // https://expressjs.com/
   const express = require('express')

   //dayjs for dates in due date for tasks
   const dayjs = require('dayjs');
    
   const app = express()
   app.use(express.static('./public'));

   //import body-parser
    const bodyParser = require('body-parser')

    //Define our models and init database 
    const { Sequelize , Model, DataTypes } = require('sequelize')
    //Create a sequelize instance
    const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database.sqlite'
    })   

    //MODELS HERE (SQL TABLES)
    //LISTS TABLE
    const Lists = sequelize.define('Lists', {
        listName : DataTypes.STRING,
        listDesc: DataTypes.STRING,

    })

    //TO DO ITEMS TABLE
    const Tasks = sequelize.define('Tasks', {
        item : DataTypes.STRING,
        completed: DataTypes.BOOLEAN,
        dueDate: DataTypes.DATE
    })

    //RELATIONSHIP BETWEEN TABLES
        Tasks.belongsTo(Lists)
        Lists.hasMany(Tasks)


    //Initialize bodyparser - converts POST request objects to json
    app.use(bodyParser.urlencoded({extended:true}))

    //sync the models to the database
    sequelize.sync() 

   //Setup the template engine
   const handlebars = require('express-handlebars')
   const { noTrueLogging } = require('sequelize/lib/utils/deprecations')
    app.engine('handlebars', handlebars.engine())
    app.set('view engine', 'handlebars')


   // To set the port execute: port=8080 node miami 
   const port = process.env.port || 3000


   //Create some routes
   //HOME
   app.get('/', async (req,res)=>{
    const lists = await Lists.findAll({ include: Tasks });
      res.type('text/html');
      res.render('page', { lists });
  })

   //CRUD ROUTES HERE
    //create list 
    app.get('/admin/list/create', (req, res) => {
        res.type('text/html');
        res.render('list'); 
      });

      app.post('/admin/list/create', async (req, res) => {
        const newList = await Lists.create({
          listName: req.body.name,
          listDesc: req.body.description
        })
        res.type('text/html')
        res.redirect('/lists')
      });


    //display all lists 
    app.get('/lists', async (req, res) => {
        const lists = await Lists.findAll({ include: Tasks });
        
          lists.forEach(list => {
            list.Tasks.forEach(task => {
              if (task.dueDate) {
                task.displayDueDate = dayjs(task.dueDate).format('MMMM D, YYYY');
              }
            });
          });
            res.type('text/html')
            res.render('lists', { lists });
        });
      

    //EDIT LIST 
    app.get('/admin/list/edit/:id', async (req, res) => {
        const lists = await Lists.findOne({where: {id:req.params.id}, raw:true}).then((data)=>{
          console.log("data")
          console.log(data)
          console.log("__________________")
          res.type('text/html')
          res.render('list', {"lists": data})
        });
      });
    
      app.post('/admin/list/edit', async(req,res) => {
        console.log(req.body)
        const lists = await Lists.findByPk(req.body.id);
        console.log(lists)
        console.log(req.body.id)
        await lists.update({
          listName: req.body.name,
          listDesc: req.body.description
        }).then(() =>{
          lists.save()
          res.type('text/html')
          //redirect to lists
          res.redirect('/admin')
        });
      });
    

    //delete list 
    app.get('/admin/list/delete/:id', async (req, res) => {
        const list = await Lists.findByPk(req.params.id);
        list.destroy();
        res.type('text/html')
        res.redirect('/lists');
      });


    //ITEMSSS
    //add to do item
    app.get('/admin/item/create/:id', async (req, res) => {
        const lists = await Lists.findOne({where: {id:req.params.id}, raw:true}).then((data)=>{
            console.log("data")
            console.log(data)
            console.log("__________________")
            res.type('text/html')
            res.render('item', {"lists": data})
          });
      });

    app.post('/admin/item/create', async (req, res) => {
        console.log(req.body)
        const list = await Lists.findByPk(req.body.lid)
        const newTask = list.createTask({
          item: req.body.item,
          completed: false,
          dueDate: req.body.dueDate
        });
        res.type('text/html')
        res.redirect(`/list/${list.id}`);
      });

    //delete to do item /task
    app.get('/admin/item/delete/:id', async (req, res) => {
        const item = await Tasks.findByPk(req.params.id);
        const listId = item.ListId; 
        await item.destroy();
        res.type('text/html')
        res.redirect(`/list/${listId}`)
    });


    //view to do items in a list/view list 
    app.get('/list/:id', async (req, res) => {
        const list = await Lists.findOne({
            where: { id: req.params.id },
            include: Tasks
          });
      
        list.Tasks.forEach(task => {
            if (task.dueDate) {
              task.displayDueDate = dayjs(task.dueDate).format('MMMM D, YYYY'); 
            }
          });

          res.render('listdetails', { 
            list: list, 
            tasks: list.Tasks 
          });
      });

    //EDIT TASKS -- mark to do item as completed with checkbox
    app.post('/admin/item/complete/:id', async (req, res) => {
        const item = await Tasks.findByPk(req.params.id);
        const listId = item.ListId; 
        item.completed = req.body.completed === 'on'; 
        item.save();
        res.redirect(`/list/${listId}`); 
    });

    //Main admin page for items and lists
    app.get('/admin', async (req, res) => {
        const lists = await Lists.findAll({ include: Tasks }).then((data) =>{
            console.log("data")
            console.log(data)
            console.log("__________________")
            res.type('text/html')
            res.render('admin', { "lists" : data });
        });
      });




   //error handling goes after the actual routes
   //The default response is not found
   app.use((req,res) => {
       res.type("text/html")
       res.status(404)
       res.send("404 not found")
   })
   //Server Error
   app.use ( (error, request,response,next)=>{
       console.log(error)
       response.type("text/html")
       response.status(500)
       response.send("500 server error")
   })


   //start the server
   app.listen(port, ()=> {
       console.log(`Express is running on http://localhost:${port};`)
       console.log(` press Ctrl-C to terminate.`)
       })
