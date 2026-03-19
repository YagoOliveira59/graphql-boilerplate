export default {
  files: ['./src/**/*.spec.ts'],
  extensions: ['ts'],
  timeout: '1m',
  concurrency: 1,
  failFast: false,
  require: ['@swc-node/register']
}
