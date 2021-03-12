# 概要
本文分析下node.js到底是如何工作的。

# 参考
1. [how-node.js-works](https://dev.to/cpuram1/how-node-js-works-a-look-behind-the-scenes-49ld)
2. [to be done](https://dev.to/cpuram1/how-node-js-works-a-look-behind-the-scenes-49ld)

# 目录
1. 介绍
2. 事件循环(Event Loop)架构
3. 事件(Events)以及事件驱动(Event-driven)架构
4. 理解stream
5. require的工作原理



## 1. 介绍
### Node,V8,Libuv和C++
在此之前我们先了解node的架构，并且以依赖(实际上也就是些nodejs需要正常运行会用到的库)的形式去呈现这个架构。
Nodejs运行环境有很多依赖，但最重要的就是V8引擎和libuv,nodejs是基于谷歌V8引擎的一个运行环境，V8引擎能让nodejs理解我们写的javascript代码,同时V8引擎也有将JavaScript代码转为机器能理解的机器语言的功能。
但是仅仅只有V8引擎去构建整个服务端(serverside)的框架是不够的，那也是为什么我们需要用到libuv,libuv是一个专注于异步I/O的开源库，它使得nodejs能访问到主机的操作系统、文件系统、网络以及更多。libuv也实现了两个nodejs非常重要的特征 -- 事件循环(the event loop)和线程池( the thread pool)。
简单的说，事件循环(the event loop)是负责处理一些简单的任务像执行回调函数或是网络I/O，线程池( the thread pool)负责处理比较繁重的工作像文件读取或是压缩，后面会有更加详细的解释。
另外，libuv和V8引擎是用C++去实现的，但nodejs可以允许我们通过纯js去访问C++实现的方法，像文件读取之类的功能。


nodejs也依赖Http parser库去解析HTTP,依赖C-ares库实现DNS相关，依赖OpenSSL实现加密和依赖Zlip实现文件压缩。

### 进程(Processes), 线程(Threads), 线程池(The Thread Pool)
当我们在电脑上运行nodejs，意味着会有一个正在运行的node进程，而node进程不过是一个正在执行的程序。在nodejs，我们可以访问process变量，在某个特定的进程里，nodejs是以单线程的形式运行着的，而线程基本上可以看成是一堆指令的序列。正因为nodejs以单线程的形式运行着，所以会很容易有导致阻塞整个应用的情况，所以要非常小心。

当我们运行nodejs时，这个单线程里面做了什么工作？


当一个程序被初始化后，所有 “最上层代码”(top-level code)被执行，即所有不在回调函数(callback)里面的代码。接下来，所有你的应用要用到的模块(modules)将会通过require操作引入，然后所有的回调函数(callback)将会被注册，最后事件循环(the event loop)将会开始循环。

但是有些繁重的任务如果放在事件循环(the event loop)里面执行消耗是非常昂贵的，会导致线程阻塞，这也就有了线程池(The Thread Pool)的由来。
提供给nodejs的线程池是由libuv实现的，它提供了与主线程完全分离的额外4个及以上的线程。我们也可以通过配置去拥有更多的线程，但是四个线程在大多数情况下已经足够了。
事件循环(the event loop)会自动将繁重的任务卸载到线程池里面执行。
类似的任务像：访问文件系统(fs)的API,加解密，压缩，DNS寻址，这些容易阻塞主线程的任务都会被nodejs自动卸载到线程池里面执行。


### 2. 事件循环(Event Loop)架构
第一节讲到了进程和单线程，本节讲下事件循环(Event Loop)，同样也是非常重要的概念。
我们首先要知道的是事件循环(Event Loop)是所有回调函数(callback)里的代码被执行的地方。所以基本上，不处于“最上层的代码”(top-level code)会在事件循环(Event Loop)里面执行，而有些繁重昂贵的任务则将会卸载到线程池中，事件循环(Event Loop)会自动完成卸载操作。

nodejs是围绕回调函数(callback)来构建的，回调函数(callback)是指那些当某些任务完成后会被调用的函数，能有这样的行为是因为nodejs是基于事件驱动(Event-driven)架构

当每次某些操作发生时，事件循环(the event loop)都会接收到一个事件(event)然后调用对应的回调函数。大体上来讲，事件循环接收到像新的HTTP请求事件，然后调用对应的回调函数，卸载繁重的工作给到线程池。
但你可能会问这些机制背后的原理是什么？回调函数的执行顺序又是怎样的？下面会逐一回答这些问题。

每当我们开始一个nodejs应用，事件循环就跟着初始化了，然后会处理我们提供的代码块（像异步API调用，定时器，或者是process.nextTick）,然后开始处理事件循环。


下图是事件循环的整个流程(引用自官网)
![事件循环](\public\images\eventLoop.png)
事件循环有多个阶段，而每个阶段都有一个快进快出的回调函数队列(这也是我们的异步代码存放和等待执行地方)。每当事件循环进入一个特定的阶段，它会执行和那个阶段相关的操作，然后会依次执行回调函数队列里面的回调函数，直到该队列变成空，或是达到了最大的回调函数执行数时，事件循环就会向下一阶段移动。

在poll阶段被处理的新事件是由内核去做入队操作的，新的poll事件甚至可以在其他poll事件被处理时入队。也就是说，一个耗时较长的回调函数会导致事件循环停留在poll阶段较长时间，此期间如果有定时器的事件到期了，也不会立马执行该定时器的回调函数。后面将会更加详细介绍。


#### timers
该阶段会执行setTimeout()和setInterval()对应的回调函数。

定时器可以设定多少时间后去执行回调函数，但并不是到那个设定的具体时间点就一定会去执行。严格意义上说，poll阶段控制timer什么时候会被执行

注意：如果有定时器到期了，那么对应的回调函数是将是第一个被事件循环处理的。但如果当前事件循环处在其他阶段时，有定时器到期，那么定时器对应的回调函数不会被立马执行，而是当事件循环回到第一阶段的时候，回调函数才会被调用。也就是说如果当前事件循环在poll阶段执行非常耗时的操作，而这时定时器到期了，并不会立马调用我们定时器的回调函数，而是等下一个循环达到timer阶段时才会调用。
每个队列里面的回调函数将会按顺序一个一个被执行，直到队列为空或是达到最大回调函数执行数时，事件循环才会进入到下一个阶段。

例子：以读取文件为例，假设我们设置了一个定时器在100ms后触发，但我们让事件循环在poll阶段时执行了150ms的耗时操作，那么定时器从程序开始运行到最后的触发时间是多少呢？
```node
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
    //因为读取文件很快这里只有几ms消耗，所以我们延迟150ms，什么都不做
    while(Date.now()-startCallback<150){
        //do nothing
    }
})

//最终打印的结果
//5ms take to read the file
//155ms have passed since I was scheduled
//我们设置了100ms后定时器过期，但是实际上执行到我们的定时器回调函数时已经过去了155ms
```
当事件循环开始进入到poll阶段时，该阶段的队列是空的，因为fs.readFile()还没完成，所以会等待一段ms时间直到最近的timer到期，当等待了5ms之后，fs.readFile()完成了对文件的读写，然后将我们的延迟150ms什么都不做的回调函数入队，并且执行。也就是会在poll阶段耗时155ms,而我们的定时器在100ms时就已经过期了，所以当离开poll阶段后，开启新的一轮循环，会来到timer阶段，并且执行我们早已过期的回调函数，打印输出。所以总时间是155ms


#### pending callbacks
该阶段适用于执行系统操作级别的回调函数，像各种TCP错误，不过多描述。
#### idle,prepare
于内部使用，不过多描述。

#### poll
该阶段会去找一些即将被处理的I/O事件类的回调函数，像文件读取，网络，压缩等等，然后将他们放入之前说的回调函数队列里面。

poll阶段有两个主要作用:
1.计算会阻塞在该阶段多长时间和I/O操作，然后
2.处理在poll阶段队列里面的事件。 

当事件循环进入poll阶段并且没有要调度的定时器时，会出现两种情况：
- 如果poll回调函数队列不为空，那么事件循环会遍历这个队列里面的回调函数，并且以同步的方式去执行这些回调函数，直到该队列为空或是达到系统的最大调用限制数才会停止。

- 如果poll回调函数队列是空的，又会有两种情况：
  - 如果我们的代码写了setImmediate,那么事件循环会结束poll阶段，然后进入到check阶段去执行setImmediate对应的回调函数。
  - 如果没有setImmediate，那么事件循环会等待回调函数被加入到队列里，然后立马执行他们。



代码例子：




#### check
第三阶段是setImmediate回调函数：setImmediate是一种特殊的定时器，如果我们想某些函数在polling阶段结束后立马执行，那么我们可以将这个函数作为setImmediate的回调函数。


#### close callbacks
第四阶段(closed callbacks)是给到一些关闭事件的回调函数,在这个阶段，所有的关闭事件将会被处理，像服务器或是socket关闭连接这一类的。