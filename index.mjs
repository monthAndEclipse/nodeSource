import express from 'express'
import router from './router/index.mjs'

const app = express();

//测试express.json()
// app.use(express.json());

//测试自定义的router
// app.use(router)


/**
 * 测试相同路由 调用和不调用next的情况
 */
app.get('/',(req,res,next)=>{
   res.send("第一个");
    //next();
})
app.get('/',(req,res)=>{
    res.end("第二个");
 })



app.listen(4399,(err)=>{
    if(err){
        throw err
    }
    console.log("server started successfully")
})

// //自定义中间件
// function myOwnmiddleware(req,res,next){
//     res.write('middle ware');
//     next();
// }