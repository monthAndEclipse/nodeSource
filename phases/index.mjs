process.nextTick(() => {
    console.log('2');
});

setImmediate(() => {
    console.log('3');
});
setTimeout(()=>{
    console.log('4')
})

console.log('1');