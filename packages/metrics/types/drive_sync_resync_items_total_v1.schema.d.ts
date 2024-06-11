/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * Measures number of items synced after re-syncs
 */
export interface HttpsProtonMeDriveSyncResyncItemsTotalV1SchemaJson {
  Labels: {
    type: "remote_new_or_modified" | "remote_deleted" | "local_new_or_modified" | "local_deleted" | "conflict";
    fullSync: "true" | "false";
    shareType: "own" | "device" | "photo" | "shared";
  };
  Value: number;
}
