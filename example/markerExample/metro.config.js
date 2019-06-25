const path = require('path')

const extraNodeModules = new Proxy({
  'react-native-image-marker': path.join(__dirname, '../../')
}, {
  get: (target, name) => {
    if (target.hasOwnProperty(name)) {
      return target[name]
    }
    return path.join(process.cwd(), `node_modules/${name}`)
  }
})
const watchFolders = [
  path.join(__dirname, '../../')
]

module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: false
      }
    })
  },
  resolver: {
    extraNodeModules
  },
  projectRoot: path.resolve(__dirname),
  watchFolders
}
