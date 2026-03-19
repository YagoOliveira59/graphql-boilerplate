// migrate-mongo configuration
// See: https://github.com/seppevs/migrate-mongo#configuration

const config = {
  mongodb: {
    url: process.env.MONGODB_URI
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.js',
  useFileHash: false,
  moduleSystem: 'commonjs'
}

module.exports = config
