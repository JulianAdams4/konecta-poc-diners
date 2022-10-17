const oauthServer = {
  client_id_private: process.env.CLIENT_ID_PRIVATE,
  client_id_public: process.env.CLIENT_ID_PUBLIC,
  client_secret_private: process.env.CLIENT_SECRET_PRIVATE,
  client_secret_public: process.env.CLIENT_SECRET_PUBLIC,
  default_oauth_password: process.env.DEFAULT_OAUTH_PASSWORD,
  default_oauth_username: process.env.DEFAULT_OAUTH_USERNAME,
  grant_type_private: process.env.GRANT_TYPE_PRIVATE,
  grant_type_public: process.env.GRANT_TYPE_PUBLIC,
  grant_type_refresh_token: process.env.GRANT_TYPE_REFRESH_TOKEN,
  oauth_redirect_uri: process.env.OAUTH_REDIRECT_URI,
  oauth_server_auth: process.env.OAUTH_AUTH_SERVER,
  oauth_server_logout: process.env.OAUTH_SERVER_LOGOUT,
  oauth_server_url: process.env.OAUTH_SERVER_URL,
  scope_private: process.env.SCOPE_PRIVATE,

  redirect_callback_timeout_seg: 60 * 5 * 1000, // ms

  attempts: 3, // For refreshing session
  timeout: 10000, // ms

  diff_time_inactivity: 10, // sec
  diff_time_refresh_token: 15, // sec
  loop_time_check_token: 10000, // ms

  typeResponseError: {
    invalidCredentials: "Invalid user credentials",
    accountDisabled: "Account disabled",
  },

  notifyPostLoginResult: {
    invalidCredentials: 0,
    accountDisabled: 1,
    success: 2,
  },
};

const contextKeys = {
  _deadline: "_dc_deadline",
  _error_meta: "_dc_error_meta",
  _error: "_dc_error",
  _next_refresh: "_dc_next_refresh",
  _pending_path: "_dc_pending_path",
  access_token: "_dc_access_token",
  challenge: "_dc_challenge",
  code_verifier: "_dc_code_verifier",
  code: "_dc_code",
  expires_in: "_dc_expires_in",
  id_token: "_dc_id_token",
  refresh_expires_in: "_dc_refresh_expires_in",
  refresh_token: "_dc_refresh_token",
  scope: "_dc_scope",
  session_state: "_dc_session_state",
  state: "_dc_state",
  token_type: "_dc_token_type",
};

// eslint-disable-next-line camelcase
const default_timeout = 5 * 60 * 1000;

const texts = {
  signinExplanationText:
    "Por favor, haz clic en el enlace y accede a tu cuenta",
  changedSessionExplanationText:
    "Parece que tu sesión ha llegado a su fin ⌛️\nPor favor, accede a tu cuenta nuevamente para continuar 🛡",
  signinButtonText: "Acceder",
};

const oauthPatterns = ["get-initialize?", "get-callback?"];

const publicPatters = ["metrics", "ping", "get-", "favicon"];

const OtpVerificationMessages = {
  0: "Codígo verificado ✅",
  1: "El código ingresado ha expirado ⌛️\nIntente de nuevo.",
  2: "El código ingresado no es correcto ❌",
  3: "Usuario bloqueado ⛔️",
  4: "Ocurrió un error al verificar el código ingresado ❗️",
};

module.exports = {
  texts,
  oauthServer,
  contextKeys,
  oauthPatterns,
  publicPatters,
  default_timeout,
  channels: ["all"],
  OtpVerificationMessages,
};
