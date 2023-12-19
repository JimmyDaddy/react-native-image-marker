import * as React from 'react';
import { Card, Button } from 'react-native-paper';
import { StyleSheet } from 'react-native';

const s = StyleSheet.create({
  row: {
    marginVertical: 8,
    flex: 1,
    marginHorizontal: 8,
    paddingHorizontal: 8,
  },
});

import TextInput from './TextInput';

export interface ValueOptions {
  value: number;
  setValue: (value: number) => void;
  testID?: string;
}

export default function ImageOptions(props: {
  alpha: ValueOptions;
  scale: ValueOptions;
  rotate: ValueOptions;
  quality?: ValueOptions;
  pickerOptions: {
    pickImage: () => void;
    testID?: string;
    label: string;
  };
}) {
  const { alpha, scale, rotate, quality } = props;
  return (
    <Card style={s.row}>
      <Card.Actions>
        <Button
          icon={'camera'}
          onPress={props.pickerOptions.pickImage}
          mode="contained"
          testID={props.pickerOptions.testID}
        >
          {props.pickerOptions.label}
        </Button>
      </Card.Actions>
      <Card.Content>
        <TextInput
          label={'scale'}
          placeholder="scale"
          testID={scale.testID}
          defaultValue={scale.value}
          onChangeText={(v) => {
            const value = Number(v);
            scale.setValue(value);
          }}
          validate={(v) => {
            const value = Number(v);
            if (value < 0) {
              return {
                pass: false,
                message: 'scale must be greater than 0',
              };
            }
            return {
              pass: true,
              message: '',
            };
          }}
        />
        <TextInput
          label={'alpha'}
          placeholder="alpha"
          testID={alpha.testID}
          defaultValue={alpha.value}
          onChangeText={(v) => {
            const value = Number(v);
            alpha.setValue(value);
          }}
          validate={(v) => {
            const value = Number(v);
            if (value < 0 || value > 1) {
              return {
                pass: false,
                message: 'alpha must be between 0 and 1',
              };
            }
            return {
              pass: true,
              message: '',
            };
          }}
        />
        <TextInput
          label={'rotate'}
          placeholder="rotate"
          defaultValue={rotate.value}
          testID={rotate.testID}
          onChangeText={(v) => {
            const value = Number(v);
            rotate.setValue(value);
          }}
          validate={(v) => {
            const value = Number(v);
            if (value < -360 || value > 360) {
              return {
                pass: false,
                message: 'rotate must be between -360 and 360',
              };
            }
            return {
              pass: true,
              message: '',
            };
          }}
        />
        {quality && (
          <TextInput
            label={'quality'}
            placeholder="quality"
            defaultValue={quality.value}
            testID={quality.testID}
            onChangeText={(v) => {
              const value = Number(v);
              quality.setValue(value);
            }}
            validate={(v) => {
              const value = Number(v);
              if (value < 0 || value > 100) {
                return {
                  pass: false,
                  message: 'quality must be between 0 and 100',
                };
              }
              return {
                pass: true,
                message: '',
              };
            }}
          />
        )}
      </Card.Content>
    </Card>
  );
}
