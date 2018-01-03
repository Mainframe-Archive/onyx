/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

//  Modified by Adam Clarke on 22/12/2017.
//  Copyright © 2017 ThusFresh, Inc. All rights reserved.

#import <React/RCTEventEmitter.h>

NS_ASSUME_NONNULL_BEGIN

@protocol OnyxWebSocketContentHandler <NSObject>

- (id)processMessage:(id __nullable)message forSocketID:(NSNumber *)socketID
            withType:(NSString *__nonnull __autoreleasing *__nonnull)type;

@end

@interface OnyxWebSocketModule : RCTEventEmitter

// Register a custom handler for a specific websocket. The handler will be strongly held by the WebSocketModule.
- (void)setContentHandler:(id<OnyxWebSocketContentHandler> __nullable)handler forSocketID:(NSNumber *)socketID;

- (void)sendData:(NSData *)data forSocketID:(nonnull NSNumber *)socketID;

@end

@interface RCTBridge (OnyxWebSocketModule)

- (OnyxWebSocketModule *)onyxWebSocketModule;

@end

NS_ASSUME_NONNULL_END

