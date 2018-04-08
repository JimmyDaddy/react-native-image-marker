import React from 'react'
import { TouchableOpacity, Image, View, Text, Platform, Dimensions, StyleSheet, ScrollView } from 'react-native'
import Marker from 'react-native-image-marker'
import Picker from 'react-native-image-picker'

const { width } = Dimensions.get('window')

const s = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20
  },
  op: {
    marginTop: 20,
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  btn: {
    padding: 10,
    borderRadius: 3,
    backgroundColor: '#00BF00',
    margin: 5,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: {
    fontSize: 15,
    color: 'white'
  },
  preview: {
    width,
    height: 300,
    flex: 1
  }
})

export default class MarkerTest extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      uri: '',
      image: '',
      marker: '',
      markImage: true
    }
  }

  _switch = () => {
    this.setState({
      markImage: !this.state.markImage
    })
  }

  render () {
    return (
      <ScrollView style={s.container}>
        <View>
          <TouchableOpacity
            style={[s.btn, {backgroundColor: '#FF7043'}]}
            onPress={this._switch}
          >
            <Text style={s.text}>switch mark {this.state.markImage ? 'image' : 'text'}</Text>
          </TouchableOpacity>
        </View>
        <View>
          <TouchableOpacity
            style={[s.btn, {backgroundColor: '#2296F3'}]}
            onPress={() => this._pickImage('image')}
          >
            <Text style={s.text}>pick image</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, {backgroundColor: '#2296F3'}]}
            onPress={() => this._pickImage('mark')}
          >
            <Text style={s.text}>pick marke image</Text>
          </TouchableOpacity>
        </View>
        <View style={s.op}>

          <TouchableOpacity
            style={s.btn}
            onPress={this._mark}
          >
            <Text style={s.text} >mark</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btn}
            onPress={() => this._markByPosition('topLeft')}
          >
            <Text style={s.text} >TopLeft</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btn}
            onPress={() => this._markByPosition('topCenter')}
          >
            <Text style={s.text} >topCenter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btn}
            onPress={() => this._markByPosition('topRight')}
          >
            <Text style={s.text} >topRight</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btn}
            onPress={() => this._markByPosition('center')}
          >
            <Text style={s.text} >Center</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btn}
            onPress={() => this._markByPosition('bottomLeft')}
          >
            <Text style={s.text} >bottomLeft</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btn}
            onPress={() => this._markByPosition('bottomCenter')}
          >
            <Text style={s.text} >bottomCenter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btn}
            onPress={() => this._markByPosition('bottomRight')}
          >
            <Text style={s.text} >bottomRight</Text>
          </TouchableOpacity>
        </View>
        <View
          style={{flex: 1}}
        >
          {
          this.state.show
            ? <Image source={{uri: this.state.uri}} resizeMode='contain' style={s.preview} />
          : null
        }
        </View>

      </ScrollView>

    )
  }

  _markByPosition = (type) => {
    if (this.state.markImage) {
      Marker.markImage({
        src: this.state.image, 
        markerSrc: this.state.marker, 
        position: type, 
        scale: 1, 
        markerScale: 0.5, 
        quality: 100
      }).then((path) => {
        this.setState({
          uri: Platform.OS === 'android' ? 'file://' + path : path,
          show: true
        })
      }).catch((err) => {
        console.log('====================================')
        console.log(err, 'err')
        console.log('====================================')
      })
    } else {
      Marker.markText({
        src: this.state.image, 
        text: 'text marker', 
        position: type, 
        color: '#FF0000',
        fontName: 'Arial-BoldItalicMT', 
        fontSize: 44, 
        scale: 1, 
        quality: 100
      })
      .then((path) => {
        this.setState({
          show: true,
          uri: Platform.OS === 'android' ? 'file://' + path : path
        })
        this.upload()
      }).catch((err) => {
        console.log('====================================')
        console.log(err)
        console.log('====================================')
      })
    }
  }

  _mark = () => {
    if (this.state.markImage) {
      Marker.markImage({
        src: this.state.image, 
        markerSrc: this.state.marker, 
        X: 100, 
        Y: 150, 
        scale: 1,
        markerScale: 0.5, 
        quality: 100
      }).then((path) => {
        this.setState({
          uri: Platform.OS === 'android' ? 'file://' + path : path,
          show: true
        })
      }).catch((err) => {
        console.log('====================================')
        console.log(err, 'err')
        console.log('====================================')
      })
    } else {
      Marker.markText({
        src: this.state.image, 
        text: 'text marker', 
        X: 30,
        Y: 30, 
        color: '#FF0000',
        fontName: 'Arial-BoldItalicMT', 
        fontSize: 44, 
        scale: 1, 
        quality: 100
      }).then((path) => {
        this.setState({
          show: true,
          uri: Platform.OS === 'android' ? 'file://' + path : path
        })
        this.upload()
      }).catch((err) => {
        console.log('====================================')
        console.log(err)
        console.log('====================================')
      })
    }
  }

  _pickImage = (type) => {
    let options = {
      title: 'title',
      takePhotoButtonTitle: 'camera',
      chooseFromLibraryButtonTitle: 'gallery',
      cancelButtonTitle: 'cancel',
      quality: 0.5,
      mediaType: 'photo',
      maxWidth: 2000,
      noData: true,
      maxHeight: 2000,
      dateFormat: 'yyyy-MM-dd HH:mm:ss',
      storageOptions: {
        skipBackup: true,
        path: 'imagePickerCache'
      },
      allowsEditing: false
    }
    Picker.showImagePicker(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled photo picker')
      } else if (response.error) {
        console.log('ImagePickerManager Error: ', response.error)
      } else if (response.customButton) {
           // this.showCamera();
      } else {
           // You can display the image using either:
           // const source = {uri: 'data:image/jpeg;base64,' + response.data, isStatic: true};
        const uri = Platform.OS === 'android' ? response.uri.replace('file://', '') : response.uri
        if (type === 'image') {
          this.setState({
            image: uri
          })
        } else {
          this.setState({
            marker: uri
          })
        }
      }
    })
  }
}
