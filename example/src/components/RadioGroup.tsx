import * as React from 'react';
import { RadioButton, Card } from 'react-native-paper';
import { View, StyleSheet } from 'react-native';

const s = StyleSheet.create({
  card: {
    marginVertical: 8,
    flex: 1,
    marginHorizontal: 8,
    paddingHorizontal: 8,
  },
  cardTitle: {
    minHeight: 16,
    paddingLeft: 8,
    paddingTop: 8,
    marginRight: 8,
  },
  cardTitleText: {
    lineHeight: 16,
    fontWeight: 'bold',
    minHeight: 16,
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  radioButtons: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    flex: 1,
  },
  radioItem: {
    paddingVertical: 0,
    paddingLeft: 0,
    paddingRight: 0,
    marginLeft: 0,
  },
});

export default (props: {
  defaultValue: string;
  title?: string;
  subTitle?: string;
  onValueChange: (value: any) => void;
  options: Array<{
    label: string;
    value: string;
    testID?: string;
  }>;
}) => {
  const [value, setValue] = React.useState(props.defaultValue);

  React.useEffect(() => {
    typeof props.onValueChange === 'function' && props.onValueChange(value);
  }, [props, value]);

  return (
    <Card style={s.card}>
      {props.title && (
        <Card.Title
          subtitle={props.subTitle}
          style={s.cardTitle}
          titleStyle={s.cardTitleText}
          subtitleVariant="labelSmall"
          titleVariant="labelMedium"
          title={props.title}
        />
      )}
      <Card.Content style={s.cardContent}>
        <RadioButton.Group
          onValueChange={(newValue) => setValue(newValue)}
          value={value}
        >
          <View style={s.radioButtons}>
            {props.options.map((option) => (
              <RadioButton.Item
                style={s.radioItem}
                testID={option.testID}
                key={option.value}
                label={option.label}
                value={option.value}
                labelVariant="labelMedium"
                mode="android"
                position="leading"
                status={value === option.value ? 'checked' : 'unchecked'}
                uncheckedColor="#FF7043"
              />
            ))}
          </View>
        </RadioButton.Group>
      </Card.Content>
    </Card>
  );
};
