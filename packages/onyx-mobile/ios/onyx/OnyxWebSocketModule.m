/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

//  Modified by Adam Clarke on 22/02/2017.
//  Copyright © 2017 ThusFresh, Inc. All rights reserved.

#import "OnyxWebSocketModule.h"

#import <objc/runtime.h>

#import <React/RCTConvert.h>
#import <React/RCTUtils.h>

#import "OnyxWebSocket.h"

@implementation OnyxWebSocket (React)

- (NSNumber *)reactTag
{
  return objc_getAssociatedObject(self, _cmd);
}

- (void)setReactTag:(NSNumber *)reactTag
{
  objc_setAssociatedObject(self, @selector(reactTag), reactTag, OBJC_ASSOCIATION_COPY_NONATOMIC);
}

@end

@interface OnyxWebSocketModule () <OnyxWebSocketDelegate>

@end

@implementation OnyxWebSocketModule
{
  NSMutableDictionary<NSNumber *, OnyxWebSocket *> *_sockets;
  NSMutableDictionary<NSNumber *, id> *_contentHandlers;
}

RCT_EXPORT_MODULE()

// Used by RCTBlobModule
@synthesize methodQueue = _methodQueue;

- (NSArray *)supportedEvents
{
  return @[@"websocketMessage",
           @"websocketOpen",
           @"websocketFailed",
           @"websocketClosed"];
}

- (void)dealloc
{
  for (OnyxWebSocket *socket in _sockets.allValues) {
    socket.delegate = nil;
    [socket close];
  }
}

RCT_EXPORT_METHOD(connect:(NSURL *)URL protocols:(NSArray *)protocols options:(NSDictionary *)options socketID:(nonnull NSNumber *)socketID)
{
  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:URL];
  
  // We load cookies from sharedHTTPCookieStorage (shared with XHR and
  // fetch). To get secure cookies for wss URLs, replace wss with https
  // in the URL.
  NSURLComponents *components = [NSURLComponents componentsWithURL:URL resolvingAgainstBaseURL:true];
  if ([components.scheme.lowercaseString isEqualToString:@"wss"]) {
    components.scheme = @"https";
  }
  
  // Load and set the cookie header.
  NSArray<NSHTTPCookie *> *cookies = [[NSHTTPCookieStorage sharedHTTPCookieStorage] cookiesForURL:components.URL];
  request.allHTTPHeaderFields = [NSHTTPCookie requestHeaderFieldsWithCookies:cookies];
  
  // Load supplied headers
  [options[@"headers"] enumerateKeysAndObjectsUsingBlock:^(NSString *key, id value, BOOL *stop) {
    [request addValue:[RCTConvert NSString:value] forHTTPHeaderField:key];
  }];
  
  OnyxWebSocket *webSocket = [[OnyxWebSocket alloc] initWithURLRequest:request protocols:protocols];
  webSocket.delegate = self;
  webSocket.reactTag = socketID;
  if (!_sockets) {
    _sockets = [NSMutableDictionary new];
  }
  _sockets[socketID] = webSocket;
  [webSocket open];
}

RCT_EXPORT_METHOD(connect:(NSURL *)URL protocols:(NSArray *)protocols options:(NSDictionary *)options socketID:(nonnull NSNumber *)socketID certData:(NSString *)certData password:(NSString *)password)
{
  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:URL];
  
  // We load cookies from sharedHTTPCookieStorage (shared with XHR and
  // fetch). To get secure cookies for wss URLs, replace wss with https
  // in the URL.
  NSURLComponents *components = [NSURLComponents componentsWithURL:URL resolvingAgainstBaseURL:true];
  if ([components.scheme.lowercaseString isEqualToString:@"wss"]) {
    components.scheme = @"https";
  }
  
  // Load and set the cookie header.
  NSArray<NSHTTPCookie *> *cookies = [[NSHTTPCookieStorage sharedHTTPCookieStorage] cookiesForURL:components.URL];
  request.allHTTPHeaderFields = [NSHTTPCookie requestHeaderFieldsWithCookies:cookies];
  
  // Load supplied headers
  [options[@"headers"] enumerateKeysAndObjectsUsingBlock:^(NSString *key, id value, BOOL *stop) {
    [request addValue:[RCTConvert NSString:value] forHTTPHeaderField:key];
  }];
  OnyxWebSocket *webSocket = [[OnyxWebSocket alloc] initWithURLRequest:request protocols:protocols certData:certData certificatePassword:password];
  webSocket.delegate = self;
  webSocket.reactTag = socketID;
  if (!_sockets) {
    _sockets = [NSMutableDictionary new];
  }
  _sockets[socketID] = webSocket;
  [webSocket open];
}

RCT_EXPORT_METHOD(send:(NSString *)message forSocketID:(nonnull NSNumber *)socketID)
{
  [_sockets[socketID] send:message];
}

RCT_EXPORT_METHOD(sendBinary:(NSString *)base64String forSocketID:(nonnull NSNumber *)socketID)
{
  [self sendData:[[NSData alloc] initWithBase64EncodedString:base64String options:0] forSocketID:socketID];
}

- (void)sendData:(NSData *)data forSocketID:(nonnull NSNumber *)socketID
{
  [_sockets[socketID] send:data];
}

RCT_EXPORT_METHOD(ping:(nonnull NSNumber *)socketID)
{
  [_sockets[socketID] sendPing:NULL];
}

RCT_EXPORT_METHOD(close:(nonnull NSNumber *)socketID)
{
  [_sockets[socketID] close];
  [_sockets removeObjectForKey:socketID];
}

- (void)setContentHandler:(id<OnyxWebSocketContentHandler>)handler forSocketID:(NSString *)socketID
{
  if (!_contentHandlers) {
    _contentHandlers = [NSMutableDictionary new];
  }
  _contentHandlers[socketID] = handler;
}

#pragma mark - RCTSRWebSocketDelegate methods

- (void)webSocket:(OnyxWebSocket *)webSocket didReceiveMessage:(id)message
{
  NSString *type;
  
  NSNumber *socketID = [webSocket reactTag];
  id contentHandler = _contentHandlers[socketID];
  if (contentHandler) {
    message = [contentHandler processMessage:message forSocketID:socketID withType:&type];
  } else {
    if ([message isKindOfClass:[NSData class]]) {
      type = @"binary";
      message = [message base64EncodedStringWithOptions:0];
    } else {
      type = @"text";
    }
  }
  
  [self sendEventWithName:@"websocketMessage" body:@{
                                                     @"data": message,
                                                     @"type": type,
                                                     @"id": webSocket.reactTag
                                                     }];
}

- (void)webSocketDidOpen:(OnyxWebSocket *)webSocket
{
  [self sendEventWithName:@"websocketOpen" body:@{
                                                  @"id": webSocket.reactTag
                                                  }];
}

- (void)webSocket:(OnyxWebSocket *)webSocket didFailWithError:(NSError *)error
{
  NSNumber *socketID = [webSocket reactTag];
  _contentHandlers[socketID] = nil;
  [self sendEventWithName:@"websocketFailed" body:@{
                                                    @"message": error.localizedDescription,
                                                    @"id": socketID
                                                    }];
}

- (void)webSocket:(OnyxWebSocket *)webSocket
 didCloseWithCode:(NSInteger)code
           reason:(NSString *)reason
         wasClean:(BOOL)wasClean
{
  NSNumber *socketID = [webSocket reactTag];
  _contentHandlers[socketID] = nil;
  [self sendEventWithName:@"websocketClosed" body:@{
                                                    @"code": @(code),
                                                    @"reason": RCTNullIfNil(reason),
                                                    @"clean": @(wasClean),
                                                    @"id": socketID
                                                    }];
}

@end

@implementation RCTBridge (OnyxWebSocketModule)

- (OnyxWebSocketModule *)webSocketModule
{
  return [self moduleForClass:[OnyxWebSocketModule class]];
}

@end

