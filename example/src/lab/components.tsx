import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

export type OffsetValue = number | string;
export type AppTab = 'tests' | 'compose' | 'advanced';

type ArchitectureRuntime = {
  hasTurboModuleProxy: boolean;
  hasFabricUIManager: boolean;
  isBridgeless: boolean;
  modeLabel: string;
  isNewArchitecture: boolean;
};

const appTabs: Array<{ label: string; value: AppTab }> = [
  { label: 'Tests', value: 'tests' },
  { label: 'Compose', value: 'compose' },
  { label: 'Advanced', value: 'advanced' },
];

function getArchitectureRuntime(): ArchitectureRuntime {
  const runtime = globalThis as typeof globalThis & {
    __turboModuleProxy?: unknown;
    nativeFabricUIManager?: unknown;
    RN$Bridgeless?: unknown;
  };
  const hasTurboModuleProxy = typeof runtime.__turboModuleProxy === 'function';
  const hasFabricUIManager = runtime.nativeFabricUIManager != null;
  const isBridgeless = runtime.RN$Bridgeless === true;
  const isNewArchitecture = hasTurboModuleProxy && hasFabricUIManager;

  return {
    hasTurboModuleProxy,
    hasFabricUIManager,
    isBridgeless,
    isNewArchitecture,
    modeLabel: isNewArchitecture ? 'New architecture' : 'Legacy bridge',
  };
}

export function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{props.title}</Text>
      {props.children}
    </View>
  );
}

export function AppButton(props: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'neutral' | 'danger';
  compact?: boolean;
  wide?: boolean;
  testID?: string;
}) {
  const tone = props.tone ?? 'primary';

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      accessible
      accessibilityLabel={props.label}
      accessibilityRole="button"
      onPress={props.onPress}
      testID={props.testID}
      style={[
        s.button,
        props.compact ? s.buttonCompact : null,
        props.wide ? s.buttonWide : null,
        tone === 'neutral' ? s.buttonNeutral : null,
        tone === 'danger' ? s.buttonDanger : null,
      ]}
    >
      <Text
        style={[s.buttonText, tone === 'neutral' ? s.buttonTextDark : null]}
      >
        {props.label}
      </Text>
    </TouchableOpacity>
  );
}

function Chip<T extends string>(props: {
  label: string;
  value: T;
  selected: boolean;
  onPress: (value: T) => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      accessibilityLabel={props.label}
      onPress={() => props.onPress(props.value)}
      style={[s.chip, props.selected ? s.chipSelected : null]}
    >
      <Text style={[s.chipText, props.selected ? s.chipTextSelected : null]}>
        {props.label}
      </Text>
    </TouchableOpacity>
  );
}

export function ChipGroup<T extends string>(props: {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  labelFor?: (value: T) => string;
}) {
  return (
    <View style={s.chipGroup}>
      {props.options.map((option) => (
        <Chip
          key={option}
          label={props.labelFor ? props.labelFor(option) : option}
          value={option}
          selected={option === props.value}
          onPress={props.onChange}
        />
      ))}
    </View>
  );
}

export function Field(props: {
  label: string;
  value: OffsetValue;
  onChange: (value: string) => void;
  width?: number;
}) {
  return (
    <View style={[s.field, props.width ? { width: props.width } : null]}>
      <Text style={s.fieldLabel}>{props.label}</Text>
      <TextInput
        keyboardType="default"
        onChangeText={props.onChange}
        selectTextOnFocus
        style={s.input}
        value={String(props.value)}
      />
    </View>
  );
}

export function NumericField(props: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  width?: number;
}) {
  return (
    <Field
      label={props.label}
      value={props.value}
      width={props.width}
      onChange={(text) => {
        const value = Number(text);
        if (!Number.isFinite(value)) {
          return;
        }
        if (props.min != null && value < props.min) {
          Toast.show({
            type: 'error',
            text1: `${props.label} range error`,
            text2: `${props.label} must be greater than or equal to ${props.min}`,
          });
          return;
        }
        if (props.max != null && value > props.max) {
          Toast.show({
            type: 'error',
            text1: `${props.label} range error`,
            text2: `${props.label} must be less than or equal to ${props.max}`,
          });
          return;
        }
        props.onChange(value);
      }}
    />
  );
}

export function ToggleRow(props: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{props.label}</Text>
      <Switch value={props.value} onValueChange={props.onValueChange} />
    </View>
  );
}

export function FeatureCard(props: {
  badge: string;
  title: string;
  meta: string;
  tone: 'blue' | 'green' | 'orange';
  onPress: () => void;
  testID: string;
}) {
  const toneStyle = {
    blue: {
      badge: s.featureBadge_blue,
      card: s.featureCard_blue,
    },
    green: {
      badge: s.featureBadge_green,
      card: s.featureCard_green,
    },
    orange: {
      badge: s.featureBadge_orange,
      card: s.featureCard_orange,
    },
  }[props.tone];

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      accessible
      accessibilityLabel={props.title}
      accessibilityRole="button"
      onPress={props.onPress}
      style={[s.featureCard, toneStyle.card]}
      testID={props.testID}
    >
      <Text numberOfLines={1} style={[s.featureBadge, toneStyle.badge]}>
        {props.badge}
      </Text>
      <View style={s.featureCopy}>
        <Text numberOfLines={1} style={s.featureTitle}>
          {props.title}
        </Text>
        <Text numberOfLines={1} style={s.featureMeta}>
          {props.meta}
        </Text>
      </View>
      <View style={s.featureRunPill}>
        <Text style={s.featureRunText}>Run</Text>
      </View>
    </TouchableOpacity>
  );
}

export function TabBar(props: {
  value: AppTab;
  onChange: (value: AppTab) => void;
}) {
  return (
    <View style={s.tabs}>
      {appTabs.map((tab) => {
        const selected = tab.value === props.value;

        return (
          <TouchableOpacity
            activeOpacity={0.78}
            accessibilityLabel={tab.label}
            accessibilityRole="button"
            key={tab.value}
            onPress={() => props.onChange(tab.value)}
            style={[s.tab, selected ? s.tabSelected : null]}
          >
            <Text style={[s.tabText, selected ? s.tabTextSelected : null]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ArchitectureSignal(props: { label: string; active: boolean }) {
  return (
    <View
      accessibilityLabel={`${props.label} ${props.active ? 'on' : 'off'}`}
      style={s.archSignal}
    >
      <View
        style={[
          s.archSignalDot,
          props.active ? s.archSignalDotOn : s.archSignalDotOff,
        ]}
      />
      <Text style={s.archSignalLabel}>{props.label}</Text>
      <Text
        style={[
          s.archSignalValue,
          props.active ? s.archSignalValueOn : s.archSignalValueOff,
        ]}
      >
        {props.active ? 'on' : 'off'}
      </Text>
    </View>
  );
}

export function ArchitecturePanel() {
  const runtime = useMemo(getArchitectureRuntime, []);

  return (
    <View
      accessibilityLabel={`runtime architecture ${runtime.modeLabel}`}
      accessible
      style={s.archPanel}
      testID="runtime-architecture-status"
    >
      <View style={s.archHeader}>
        <View>
          <Text style={s.archEyebrow}>Runtime</Text>
          <Text style={s.archTitle}>Architecture status</Text>
        </View>
        <View
          style={[
            s.archModePill,
            runtime.isNewArchitecture
              ? s.archModePillNew
              : s.archModePillLegacy,
          ]}
        >
          <Text
            style={[
              s.archModeText,
              runtime.isNewArchitecture
                ? s.archModeTextNew
                : s.archModeTextLegacy,
            ]}
            numberOfLines={1}
          >
            {runtime.modeLabel}
          </Text>
        </View>
      </View>
      <View style={s.archSignals}>
        <ArchitectureSignal
          label="TurboModule"
          active={runtime.hasTurboModuleProxy}
        />
        <ArchitectureSignal
          label="Fabric renderer"
          active={runtime.hasFabricUIManager}
        />
        <ArchitectureSignal label="Bridgeless" active={runtime.isBridgeless} />
      </View>
    </View>
  );
}

export function PreviewPanel(props: {
  show: boolean;
  uri: string;
  fileSize: string;
  onClear: () => void;
  compact?: boolean;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!props.show) {
      setPreviewOpen(false);
    }
  }, [props.show]);

  return (
    <View style={s.previewPanel}>
      <View style={s.previewHeader}>
        <View>
          <Text style={s.previewTitle}>Result preview</Text>
          <Text style={s.previewSubtle}>Size {props.fileSize}</Text>
        </View>
        <View style={s.previewActions}>
          <AppButton
            compact
            label="Clear"
            tone="neutral"
            onPress={props.onClear}
          />
        </View>
      </View>
      <View
        accessibilityLabel={
          props.show ? 'result-preview-ready' : 'result-preview-empty'
        }
        accessible
        style={[s.previewFrame, props.compact ? s.previewFrameCompact : null]}
        testID={props.show ? 'result-preview-ready' : 'result-preview-empty'}
      >
        {props.show ? (
          <TouchableOpacity
            activeOpacity={0.9}
            accessibilityLabel="Open result preview"
            accessibilityRole="imagebutton"
            onPress={() => setPreviewOpen(true)}
            style={s.previewImageButton}
            testID="result-preview-open"
          >
            <Image
              accessible
              accessibilityLabel="result-preview-image"
              source={{ uri: props.uri }}
              testID="result-preview-image"
              resizeMode="contain"
              style={s.previewImage}
            />
          </TouchableOpacity>
        ) : (
          <View style={s.previewEmpty}>
            <Text style={s.previewEmptyTitle}>No output yet</Text>
            <Text style={s.previewEmptyText}>Ready for the next mark</Text>
          </View>
        )}
      </View>
      {props.show && previewOpen ? (
        <Modal
          animationType="fade"
          transparent
          visible
          statusBarTranslucent
          onRequestClose={() => setPreviewOpen(false)}
        >
          <SafeAreaView style={s.previewModalContainer}>
            <View style={s.previewModalContent}>
              <View style={s.previewModalHeader}>
                <Text style={s.previewModalTitle}>Result preview</Text>
                <TouchableOpacity
                  activeOpacity={0.78}
                  accessible
                  accessibilityLabel="Close result preview"
                  accessibilityRole="button"
                  onPress={() => setPreviewOpen(false)}
                  style={[
                    s.button,
                    s.buttonCompact,
                    s.buttonNeutral,
                    s.previewModalCloseButton,
                  ]}
                  testID="result-preview-close"
                >
                  <Text style={[s.buttonText, s.buttonTextDark]}>Close</Text>
                </TouchableOpacity>
              </View>
              <View
                accessibilityLabel="result-preview-modal"
                accessible
                style={s.previewModalFrame}
                testID="result-preview-modal"
              >
                <Image
                  accessible
                  accessibilityLabel="result-preview-modal-image"
                  resizeMode="contain"
                  source={{ uri: props.uri }}
                  style={s.previewModalImage}
                  testID="result-preview-modal-image"
                />
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  tabs: {
    backgroundColor: '#E6EDF2',
    borderColor: '#D6E0E6',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 12,
    padding: 3,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    minHeight: 36,
  },
  tabSelected: {
    backgroundColor: '#0F172A',
  },
  tabText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '800',
  },
  tabTextSelected: {
    color: '#FFFFFF',
  },
  archPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE5EA',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 10,
  },
  archHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  archEyebrow: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  archTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  archModePill: {
    borderRadius: 7,
    borderWidth: 1,
    marginLeft: 10,
    maxWidth: width * 0.48,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  archModePillNew: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  archModePillLegacy: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  archModeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  archModeTextNew: {
    color: '#166534',
  },
  archModeTextLegacy: {
    color: '#92400E',
  },
  archSignals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -3,
    marginVertical: -3,
  },
  archSignal: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 7,
    borderWidth: 1,
    flexDirection: 'row',
    margin: 3,
    minHeight: 32,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  archSignalDot: {
    borderRadius: 4,
    height: 8,
    marginRight: 6,
    width: 8,
  },
  archSignalDotOn: {
    backgroundColor: '#16A34A',
  },
  archSignalDotOff: {
    backgroundColor: '#CBD5E1',
  },
  archSignalLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 6,
  },
  archSignalValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  archSignalValueOn: {
    color: '#15803D',
  },
  archSignalValueOff: {
    color: '#64748B',
  },
  previewPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE5EA',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  previewTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  previewSubtle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  previewActions: {
    alignItems: 'flex-end',
  },
  previewFrame: {
    alignItems: 'center',
    aspectRatio: 16 / 7,
    backgroundColor: '#E7EEF3',
    borderRadius: 6,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  previewFrameCompact: {
    aspectRatio: 16 / 5,
  },
  previewImageButton: {
    height: '100%',
    width: '100%',
  },
  previewImage: {
    height: '100%',
    width: '100%',
  },
  previewEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  previewEmptyTitle: {
    color: '#334155',
    fontSize: 17,
    fontWeight: '800',
  },
  previewEmptyText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 4,
  },
  previewModalContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
    flex: 1,
    justifyContent: 'center',
    padding: 14,
  },
  previewModalContent: {
    flex: 1,
    justifyContent: 'center',
  },
  previewModalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  previewModalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  previewModalCloseButton: {
    margin: 0,
  },
  previewModalFrame: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  previewModalImage: {
    height: '100%',
    width: '100%',
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  featureCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    minHeight: 64,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: '100%',
  },
  featureCard_blue: {
    borderColor: '#BFDBFE',
  },
  featureCard_green: {
    borderColor: '#BBF7D0',
  },
  featureCard_orange: {
    borderColor: '#FED7AA',
  },
  featureBadge: {
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '800',
    marginRight: 10,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'center',
    width: 64,
  },
  featureBadge_blue: {
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
  },
  featureBadge_green: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
  },
  featureBadge_orange: {
    backgroundColor: '#FFEDD5',
    color: '#C2410C',
  },
  featureTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  featureMeta: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 3,
  },
  featureCopy: {
    flex: 1,
    minWidth: 0,
  },
  featureRunPill: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  featureRunText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -3,
    marginVertical: -3,
  },
  chip: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 7,
    borderWidth: 1,
    margin: 3,
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  chipText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 7,
    justifyContent: 'center',
    margin: 4,
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  buttonCompact: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonNeutral: {
    backgroundColor: '#E6EDF2',
  },
  buttonDanger: {
    backgroundColor: '#E11D48',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  buttonTextDark: {
    color: '#0F172A',
  },
  buttonWide: {
    flexBasis: 0,
    flexGrow: 1,
    minWidth: 150,
  },
  field: {
    margin: 4,
  },
  fieldLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 7,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 15,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  toggleRow: {
    alignItems: 'center',
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 46,
  },
  toggleLabel: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
});
