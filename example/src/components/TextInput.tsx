import * as React from 'react';
import { TextInput, HelperText } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';

const s = StyleSheet.create({
  shortTextInput: {
    height: 30,
    backgroundColor: '#ffA',
    borderColor: '#00B96B5A',
    borderWidth: 0,
    padding: 0,
    fontSize: 12,
  },
});

export default (props: {
  label: string;
  defaultValue: any;
  placeholder: string;
  multiline?: boolean;
  onChangeText: (value: any) => void;
  validate: (value: string) => { pass: boolean; message: string };
  testID?: string;
  textColor?: string;
  style?: any;
  numberOfLines?: number;
  contentStyle?: any;
}) => {
  const [value, setValue] = React.useState(props.defaultValue);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    typeof props.onChangeText === 'function' && props.onChangeText(value);
  }, [props, value]);

  return (
    <View>
      <TextInput
        multiline={props.multiline}
        testID={props.testID}
        mode="outlined"
        label={props.label}
        placeholder="scale"
        contentStyle={props.contentStyle}
        style={[s.shortTextInput, props.style]}
        defaultValue={String(props.defaultValue)}
        textColor={props.textColor}
        error={!!error}
        numberOfLines={props.numberOfLines}
        onChangeText={(v) => {
          if (typeof props.validate === 'function') {
            const { pass, message } = props.validate(v);
            if (!pass) {
              setError(message);
              return;
            } else {
              setError('');
            }
          }
          setValue(value);
        }}
        autoFocus={false}
      />
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>
    </View>
  );
};
