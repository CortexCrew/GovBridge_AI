app=require(express)
app.use(express.json())
const {create_complaint,get_all_complaints}=require('./complaints_contoller')
app.post('/complaints', create_complaint);
app.get('/complaints', get_all_complaints);