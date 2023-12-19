import * as React from 'react';
import { Card, Text, Switch } from 'react-native-paper';
import { StyleSheet } from 'react-native';

import TextInput from './TextInput';
import { Row, RowSplit } from './Row';

const s = StyleSheet.create({
  label: {
    marginRight: 8,
  },
  container: {
    flex: 1,
  },
  markTextInputContentStyle: {
    minHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
  },
  markTextInputContainerStyle: {
    minHeight: 120,
    marginRight: 8,
  },
  splitContent: {
    display: 'flex',
    flexDirection: 'column',
  },
});

export default function TextOptions(props: {
  text: string;
  setText: (value: string) => void;
  fontSize: number;
  setFontSize: (value: number) => void;
  useTextShadow: boolean;
  setUseTextShadow: (value: boolean) => void;
  useTextBgStyle: boolean;
  setUseTextBgStyle: (value: boolean) => void;
  underline: boolean;
  setUnderline: (value: boolean) => void;
  italic: boolean;
  setItalic: (value: boolean) => void;
  bold: boolean;
  setBold: (value: boolean) => void;
  strikeThrough: boolean;
  setStrikeThrough: (value: boolean) => void;
}) {
  const {
    text,
    fontSize,
    setText,
    setFontSize,
    useTextBgStyle,
    setUseTextBgStyle,
    useTextShadow,
    setUseTextShadow,
    underline,
    setUnderline,
    italic,
    setItalic,
    bold,
    setBold,
    strikeThrough,
    setStrikeThrough,
  } = props;
  return (
    <Card style={s.container}>
      <Card.Content>
        <Row>
          <RowSplit>
            <TextInput
              multiline
              contentStyle={s.markTextInputContentStyle}
              style={s.markTextInputContainerStyle}
              numberOfLines={2}
              textColor={'#000'}
              label={'text'}
              placeholder="text"
              testID={'textWatermark'}
              defaultValue={text || 'Hello World \n 你好'}
              onChangeText={(v) => {
                setText(v);
              }}
              validate={(v) => {
                if (!v) {
                  return {
                    pass: false,
                    message: 'text water mark must not be empty',
                  };
                }
                return {
                  pass: true,
                  message: '',
                };
              }}
            />
          </RowSplit>
          <RowSplit>
            <RowSplit>
              <TextInput
                label="fontSize"
                placeholder="fontSize"
                testID={'textWatermarkFontSize'}
                validate={(v) => {
                  const value = Number(v);
                  if (value <= 0) {
                    return {
                      pass: false,
                      message: 'font size must be greater than 0',
                    };
                  }
                  return {
                    pass: true,
                    message: '',
                  };
                }}
                defaultValue={fontSize}
                onChangeText={setFontSize}
              />
            </RowSplit>
            <RowSplit>
              <Text style={s.label}>shadow:</Text>
              <Switch value={useTextShadow} onValueChange={setUseTextShadow} />
            </RowSplit>
          </RowSplit>
        </Row>
        <Row>
          <RowSplit>
            <Text style={s.label}>background:</Text>
            <Switch value={useTextBgStyle} onValueChange={setUseTextBgStyle} />
          </RowSplit>
        </Row>
        <Row>
          <RowSplit>
            <RowSplit style={{ flex: 2 }}>
              <Text style={s.label}>underline:</Text>
            </RowSplit>
            <RowSplit>
              <Switch value={underline} onValueChange={setUnderline} />
            </RowSplit>
          </RowSplit>
          <RowSplit>
            <RowSplit style={{ flex: 2 }}>
              <Text style={s.label}>italic:</Text>
            </RowSplit>
            <RowSplit>
              <Switch value={italic} onValueChange={setItalic} />
            </RowSplit>
          </RowSplit>
        </Row>
        <Row>
          <RowSplit>
            <RowSplit style={{ flex: 2 }}>
              <Text style={s.label}>bold:</Text>
            </RowSplit>
            <RowSplit>
              <Switch value={bold} onValueChange={setBold} />
            </RowSplit>
          </RowSplit>
          <RowSplit>
            <RowSplit style={{ flex: 2 }}>
              <Text style={s.label}>strikeThrough:</Text>
            </RowSplit>
            <RowSplit>
              <Switch value={strikeThrough} onValueChange={setStrikeThrough} />
            </RowSplit>
          </RowSplit>
        </Row>
      </Card.Content>
    </Card>
  );
}
