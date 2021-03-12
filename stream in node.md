本文介绍nodejs的stream,[官方参考文档](https://nodejs.org/dist/latest-v14.x/docs/api/stream.html)(英文好的可以直接撸文档).

# Stream

### 概括
>A stream is an abstract interface for working with streaming data in Node.js. The stream module provides an API for implementing the stream interface.
There are many stream objects provided by Node.js. For instance, a request to an HTTP server and process.stdout are both stream instances.
Streams can be readable, writable, or both. All streams are instances of EventEmitter.
The stream module is useful for creating new types of stream instances. It is usually not necessary to use the stream module to consume streams.
--
stream是一个处理node.js中数据流的抽象接口，stream模块提供了实现stream接口的API。nodejs提供了很多stream对象，像http的request，和process.stdout都是stream实例。stream可以是可读，或可写，或两者兼具，所有的stream都是EventEmitter的实例.stream模块对于在创建新类型的stream实例是特别有用的，但利用stream去消费其他streams通常是不必要的。

### stream类型