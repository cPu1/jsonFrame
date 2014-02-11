jsonFrame
=========

A jsonrpc 2.0 implementation supporting both TCP and HTTP transports. The TCP implementation frames each jsonrpc request/response object with a length prefix, which specifies the length in bytes of the actual message.

## Package
* JSON-RPC TCP server and client
* Connect middleware for application/json-rpc POST requests
* TODO: jQuery function plugin for HTTP transport
* jsonTransformer: A node.js streams2 Transform implementation that reads length-prefixed messages built using jsonFrame.build
