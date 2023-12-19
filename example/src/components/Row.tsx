import React from 'react';
import { StyleSheet, View } from 'react-native';

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 5,
    flex: 1,
  },
  rowSplit: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'row',
  },
});

export function RowSplit(props: any) {
  return <View style={[s.rowSplit, props.style]}>{props.children}</View>;
}

export function Row(props: any) {
  return <View style={[s.row, props.style]}>{props.children}</View>;
}
