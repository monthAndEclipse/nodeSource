import express from "express"
const router = new express.Router()

router.get('/route',(req,res)=>{
    res.end(JSON.stringify({message:"hello"}))
})

export default router;