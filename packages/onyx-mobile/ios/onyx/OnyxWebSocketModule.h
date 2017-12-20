//
//  OnyxWebSocketModule.h
//  onyx
//
//  Created by Adam Clarke on 18/12/2017.
//  Copyright © 2017 Facebook. All rights reserved.
//

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

