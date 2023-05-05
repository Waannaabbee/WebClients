export const HTTP_ERROR_CODES = {
    ABORTED: -1,
    TIMEOUT: 0,
    UNPROCESSABLE_ENTITY: 422,
    UNAUTHORIZED: 401,
    UNLOCK: 403,
    TOO_MANY_REQUESTS: 429,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
};

export const API_CUSTOM_ERROR_CODES = {
    APP_VERSION_BAD: 5003,
    ALREADY_USED: 2001,
    EMAIL_FORMAT: 2050,
    NOT_ALLOWED: 2011,
    TOO_MANY_CHILDREN: 8003,
    HUMAN_VERIFICATION_REQUIRED: 9001,
    DEVICE_VERIFICATION_REQUIRED: 9002,
    AUTH_ACCOUNT_DISABLED: 10003,
    USER_UPDATE_EMAIL_SELF: 12007,
    TOKEN_INVALID: 12087,
    KEY_GET_INPUT_INVALID: 33101,
    KEY_GET_ADDRESS_MISSING: 33102,
    KEY_GET_DOMAIN_MISSING_MX: 33103,
    INCOMING_DEFAULT_UPDATE_NOT_EXIST: 35023,
    USER_EXISTS_USERNAME_ALREADY_USED: 12106,
    NO_RESET_METHODS: 2029,
    JWT_EXPIRED: 8005,
    PAYMENTS_SUBSCRIPTION_AMOUNT_MISMATCH: 22101,
    USER_CREATE_TOKEN_INVALID: 12087,
};

export const EVENT_ERRORS = {
    MAIL: 1,
    CONTACTS: 2,
};
