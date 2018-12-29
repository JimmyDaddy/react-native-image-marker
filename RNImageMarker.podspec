require 'json'

package = JSON.parse(File.read('package.json'))

Pod::Spec.new do |s|
  s.name         = "RNImageMarker"
  s.version      = package['version']
  s.summary      = package['description']

  s.author       = { "JimmyDaddy" => "heyjimmygo@gmail.com" }
  s.homepage     = package['homepage']
  s.license      = package['license']
  s.platform     = :ios, "8.0"

  s.source       = { :git => "https://github.com/JimmyDaddy/react-native-image-marker.git", :tag => s.version }
  s.source_files = 'ios/**/*.{h,m}'

  s.dependency 'React'
end
