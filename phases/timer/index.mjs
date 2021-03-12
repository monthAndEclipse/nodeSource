import fs from "fs"
let startReading;
function readFileLocally(path,callback){
    startReading = Date.now();
    fs.readFile(path,callback);
}

const timeoutScheduled = Date.now();
const path = "E:\\download\\ielts\\favorites-web-master.zip";
setTimeout(()=>{
    const delay = Date.now();
    console.log(`${delay-timeoutScheduled}ms have passed since I was scheduled`);
},100)


readFileLocally(path,function (){
    const startCallback = Date.now();
    console.log(`${startCallback-startReading}ms take to read the file`);
    while(Date.now()-startCallback<150){
        //do nothing
    }
})

//almost takes 3ms to read the file,150ms delay,so the total time passed before the timer has been executed is 153ms second 