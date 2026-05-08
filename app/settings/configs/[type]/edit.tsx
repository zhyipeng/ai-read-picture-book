import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActionButton } from "@/components/ActionButton";
import { Dialog } from "@/components/Dialog";
import { OptionSheet } from "@/components/OptionSheet";
import {
  createModelConfig,
  deleteModelConfig,
  getModelConfigById,
  updateModelConfig,
} from "@/lib/db/modelConfigs";
import { getAppSettings, updateAppSettings } from "@/lib/db/settings";
import {
  formatPlaybackSpeed,
  getConfigTypeShortTitle,
  getVisionAdvancedParamsText,
  getVisionOpenAiCompatible,
  isModelConfigType,
  PLAYBACK_SPEED_OPTIONS,
} from "@/lib/settings/configs";
import type { CreateModelConfigInput, ModelConfig } from "@/types/config";
import type { AppSettings } from "@/types/settings";

type FieldErrors = {
  name?: string;
  baseUrl?: string;
  apiKeyRef?: string;
  model?: string;
  voice?: string;
  extraParams?: string;
};

async function clearDeletedConfigFromSettings(config: ModelConfig, settings: AppSettings) {
  const updates: Partial<AppSettings> = {};

  if (config.type === "vision") {
    if (settings.defaultZhVisionConfigId === config.id) {
      updates.defaultZhVisionConfigId = null;
    }
    if (settings.defaultEnVisionConfigId === config.id) {
      updates.defaultEnVisionConfigId = null;
    }
  } else {
    if (settings.defaultZhTtsConfigId === config.id) {
      updates.defaultZhTtsConfigId = null;
    }
    if (settings.defaultEnTtsConfigId === config.id) {
      updates.defaultEnTtsConfigId = null;
    }
  }

  if (Object.keys(updates).length > 0) {
    await updateAppSettings(updates);
  }
}

function buildExtraParamsString(params: {
  type: "vision" | "tts";
  rawText: string;
  openAiCompatible: boolean;
}): string | null {
  const trimmed = params.rawText.trim();

  if (!trimmed) {
    if (params.type === "vision") {
      return JSON.stringify({ openaiCompatible: params.openAiCompatible });
    }

    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("高级参数必须是合法的 JSON 对象。");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("高级参数必须是 JSON 对象。");
  }

  const nextObject = {
    ...(parsed as Record<string, unknown>),
  };

  if (params.type === "vision") {
    nextObject.openaiCompatible = params.openAiCompatible;
  }

  return JSON.stringify(nextObject);
}

export default function ConfigEditorScreen() {
  const params = useLocalSearchParams<{
    type?: string | string[];
    configId?: string | string[];
  }>();
  const isFocused = useIsFocused();
  const type = isModelConfigType(params.type) ? params.type : null;
  const configId =
    typeof params.configId === "string" ? params.configId : params.configId?.[0];
  const isEditMode = Boolean(configId);
  const pageTitle = type
    ? `${isEditMode ? "编辑" : "新建"}${getConfigTypeShortTitle(type)}`
    : "配置编辑";
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<ModelConfig | null>(null);
  const [settingsSnapshot, setSettingsSnapshot] = useState<AppSettings | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSpeedSheet, setShowSpeedSheet] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKeyRef, setApiKeyRef] = useState("");
  const [model, setModel] = useState("");
  const [voice, setVoice] = useState("");
  const [speed, setSpeed] = useState(1);
  const [openAiCompatible, setOpenAiCompatible] = useState(true);
  const [extraParamsText, setExtraParamsText] = useState("");

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    let cancelled = false;

    async function load() {
      if (!type) {
        setCurrentConfig(null);
        setSettingsSnapshot(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const [settings, config] = await Promise.all([
          getAppSettings(),
          configId ? getModelConfigById(configId) : Promise.resolve(null),
        ]);

        if (!cancelled) {
          setSettingsSnapshot(settings);
          setCurrentConfig(config);

          if (config) {
            setName(config.name);
            setBaseUrl(config.baseUrl);
            setApiKeyRef(config.apiKeyRef);
            setModel(config.model);
            setVoice(config.voice ?? "");
            setSpeed(config.speed ?? 1);
            setOpenAiCompatible(getVisionOpenAiCompatible(config.extraParams));
            setExtraParamsText(
              config.type === "vision"
                ? getVisionAdvancedParamsText(config.extraParams)
                : config.extraParams ?? ""
            );
          } else {
            setName("");
            setBaseUrl("");
            setApiKeyRef("");
            setModel("");
            setVoice("");
            setSpeed(1);
            setOpenAiCompatible(true);
            setExtraParamsText("");
          }
        }
      } catch (error) {
        if (!cancelled) {
          Alert.alert(
            "加载失败",
            error instanceof Error ? error.message : "配置内容暂时无法读取。"
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [configId, isFocused, type]);

  if (!type) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <Stack.Screen options={{ title: "配置编辑" }} />
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={32} color="#cb7349" />
          <Text style={styles.stateTitle}>配置类型无效</Text>
        </View>
      </SafeAreaView>
    );
  }

  const resolvedType = type;

  function validateFields(): boolean {
    const nextErrors: FieldErrors = {};

    if (!name.trim()) {
      nextErrors.name = "请输入配置名称";
    }
    if (!baseUrl.trim()) {
      nextErrors.baseUrl = "请输入 Base URL";
    }
    if (!apiKeyRef.trim()) {
      nextErrors.apiKeyRef = "请输入 API Key";
    }
    if (!model.trim()) {
      nextErrors.model = "请输入 Model";
    }
    if (type === "tts" && !voice.trim()) {
      nextErrors.voice = "请输入 Voice";
    }

    const trimmedExtraParams = extraParamsText.trim();

    if (trimmedExtraParams) {
      try {
        const parsed = JSON.parse(trimmedExtraParams) as unknown;

        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          nextErrors.extraParams = "高级参数必须是 JSON 对象";
        }
      } catch {
        nextErrors.extraParams = "高级参数必须是合法 JSON";
      }
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSave() {
    if (isSaving || !validateFields()) {
      return;
    }

    setIsSaving(true);

    try {
      const createPayload: CreateModelConfigInput = {
        type: resolvedType,
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        apiKeyRef: apiKeyRef.trim(),
        model: model.trim(),
        voice: resolvedType === "tts" ? voice.trim() : null,
        speed: resolvedType === "tts" ? speed : null,
        extraParams: buildExtraParamsString({
          type: resolvedType,
          rawText: extraParamsText,
          openAiCompatible,
        }),
      };

      if (configId) {
        await updateModelConfig(configId, {
          name: createPayload.name,
          baseUrl: createPayload.baseUrl,
          apiKeyRef: createPayload.apiKeyRef,
          model: createPayload.model,
          voice: createPayload.voice,
          speed: createPayload.speed,
          extraParams: createPayload.extraParams,
        });
      } else {
        await createModelConfig(createPayload);
      }

      router.back();
    } catch (error) {
      Alert.alert(
        "保存失败",
        error instanceof Error ? error.message : "配置暂时无法保存。"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!currentConfig || !settingsSnapshot || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await deleteModelConfig(currentConfig.id);
      await clearDeletedConfigFromSettings(currentConfig, settingsSnapshot);
      setShowDeleteDialog(false);
      router.back();
    } catch (error) {
      Alert.alert(
        "删除失败",
        error instanceof Error ? error.message : "配置暂时无法删除。"
      );
    } finally {
      setIsSaving(false);
    }
  }

  function renderErrorText(message?: string) {
    if (!message) {
      return null;
    }

    return <Text style={styles.errorText}>{message}</Text>;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: pageTitle }} />

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#e78842" />
          <Text style={styles.stateText}>正在加载配置</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formCard}>
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>
                  配置名称 <Text style={styles.requiredMark}>*</Text>
                </Text>
                <TextInput
                  value={name}
                  onChangeText={(value) => {
                    setName(value);
                    setErrors((current) => ({ ...current, name: undefined }));
                  }}
                  placeholder={type === "vision" ? "例如：本地-Vision" : "例如：本地TTS-女声"}
                  placeholderTextColor="#bea998"
                  style={[styles.input, errors.name ? styles.inputError : null]}
                  maxLength={60}
                />
                {renderErrorText(errors.name)}
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>
                  Base URL <Text style={styles.requiredMark}>*</Text>
                </Text>
                <TextInput
                  value={baseUrl}
                  onChangeText={(value) => {
                    setBaseUrl(value);
                    setErrors((current) => ({ ...current, baseUrl: undefined }));
                  }}
                  placeholder="http://127.0.0.1:8000/v1"
                  placeholderTextColor="#bea998"
                  style={[styles.input, errors.baseUrl ? styles.inputError : null]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {renderErrorText(errors.baseUrl)}
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>
                  API Key <Text style={styles.requiredMark}>*</Text>
                </Text>
                <View style={[styles.inputWrap, errors.apiKeyRef ? styles.inputError : null]}>
                  <TextInput
                    value={apiKeyRef}
                    onChangeText={(value) => {
                      setApiKeyRef(value);
                      setErrors((current) => ({ ...current, apiKeyRef: undefined }));
                    }}
                    placeholder="请输入 API Key"
                    placeholderTextColor="#bea998"
                    style={styles.inlineInput}
                    secureTextEntry={!showApiKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable
                    hitSlop={8}
                    style={styles.eyeButton}
                    onPress={() => setShowApiKey((current) => !current)}
                  >
                    <Ionicons
                      name={showApiKey ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color="#a7927d"
                    />
                  </Pressable>
                </View>
                {renderErrorText(errors.apiKeyRef)}
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>
                  Model <Text style={styles.requiredMark}>*</Text>
                </Text>
                <TextInput
                  value={model}
                  onChangeText={(value) => {
                    setModel(value);
                    setErrors((current) => ({ ...current, model: undefined }));
                  }}
                  placeholder={type === "vision" ? "qwen-vl-max" : "cosyvoice-2"}
                  placeholderTextColor="#bea998"
                  style={[styles.input, errors.model ? styles.inputError : null]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {renderErrorText(errors.model)}
              </View>

              {type === "vision" ? (
                <View style={styles.fieldBlock}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchTextWrap}>
                      <Text style={styles.label}>是否 OpenAI 兼容</Text>
                      <Text style={styles.helperText}>
                        开启后按 OpenAI 风格接口组织请求参数。
                      </Text>
                    </View>
                    <Switch
                      value={openAiCompatible}
                      onValueChange={setOpenAiCompatible}
                      trackColor={{ false: "#dec9b3", true: "#8acb8d" }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.fieldBlock}>
                    <Text style={styles.label}>
                      Voice <Text style={styles.requiredMark}>*</Text>
                    </Text>
                    <TextInput
                      value={voice}
                      onChangeText={(value) => {
                        setVoice(value);
                        setErrors((current) => ({ ...current, voice: undefined }));
                      }}
                      placeholder="例如：女声-温馨"
                      placeholderTextColor="#bea998"
                      style={[styles.input, errors.voice ? styles.inputError : null]}
                    />
                    {renderErrorText(errors.voice)}
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.label}>Speed</Text>
                    <Pressable
                      style={styles.selectorInput}
                      onPress={() => setShowSpeedSheet(true)}
                    >
                      <Text style={styles.selectorValue}>{formatPlaybackSpeed(speed)}</Text>
                      <Ionicons name="chevron-down" size={18} color="#b39e8b" />
                    </Pressable>
                  </View>
                </>
              )}

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>高级参数（JSON，可选）</Text>
                <TextInput
                  value={extraParamsText}
                  onChangeText={(value) => {
                    setExtraParamsText(value);
                    setErrors((current) => ({ ...current, extraParams: undefined }));
                  }}
                  placeholder='例如：{"temperature":0.2}'
                  placeholderTextColor="#bea998"
                  style={[
                    styles.input,
                    styles.multilineInput,
                    errors.extraParams ? styles.inputError : null,
                  ]}
                  multiline
                  textAlignVertical="top"
                />
                <Text style={styles.helperText}>
                  {type === "vision"
                    ? "这里填写除 openaiCompatible 之外的附加参数。"
                    : "可填写供应商扩展参数。"}
                </Text>
                {renderErrorText(errors.extraParams)}
              </View>
            </View>

            <View style={styles.actionRow}>
              {isEditMode ? (
                <ActionButton
                  label="删除"
                  onPress={() => setShowDeleteDialog(true)}
                  style={styles.deleteButton}
                  textStyle={styles.deleteButtonText}
                />
              ) : (
                <ActionButton
                  label="取消"
                  onPress={() => router.back()}
                  style={styles.cancelButton}
                  textStyle={styles.cancelButtonText}
                />
              )}
              <ActionButton
                label={isSaving ? "保存中..." : "保存"}
                onPress={() => void handleSave()}
                style={styles.saveButton}
                textStyle={styles.saveButtonText}
                disabled={isSaving}
                disabledStyle={styles.saveButtonDisabled}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <OptionSheet
        visible={showSpeedSheet}
        title="选择 Speed"
        options={PLAYBACK_SPEED_OPTIONS.map((item) => ({
          key: `${item}`,
          label: formatPlaybackSpeed(item),
          description: item === 1 ? "标准语速" : undefined,
          selected: item === speed,
        }))}
        onClose={() => setShowSpeedSheet(false)}
        onSelect={(key) => {
          setSpeed(Number(key));
          setShowSpeedSheet(false);
        }}
      />

      <Dialog
        visible={showDeleteDialog}
        title="删除配置"
        message={`删除后，这组${getConfigTypeShortTitle(type)}将不可恢复。若它已被设置为默认值，会同步清空默认绑定。`}
        confirmText="删除"
        cancelText="取消"
        onCancel={() => setShowDeleteDialog(false)}
        onConfirm={() => void handleDelete()}
        confirmDisabled={isSaving}
        cancelDisabled={isSaving}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F2EC",
  },
  keyboardView: {
    flex: 1,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#4a3c31",
  },
  stateText: {
    fontSize: 15,
    color: "#8f7c69",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 16,
  },
  formCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#efdfcf",
    backgroundColor: "#fffdf9",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 14,
  },
  fieldBlock: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#43362C",
  },
  requiredMark: {
    color: "#e06b2d",
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e7ddcf",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#2f241a",
  },
  inputWrap: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e7ddcf",
    backgroundColor: "#fff",
    paddingLeft: 14,
    paddingRight: 10,
  },
  inlineInput: {
    flex: 1,
    minHeight: 48,
    fontSize: 15,
    color: "#2f241a",
  },
  eyeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  inputError: {
    borderColor: "#d85d43",
  },
  multilineInput: {
    minHeight: 110,
    paddingTop: 12,
    paddingBottom: 12,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#8e7b69",
  },
  errorText: {
    fontSize: 13,
    color: "#d85d43",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0e3d5",
    backgroundColor: "#fff8ef",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  switchTextWrap: {
    flex: 1,
    gap: 4,
  },
  selectorInput: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e7ddcf",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
  },
  selectorValue: {
    fontSize: 15,
    color: "#2f241a",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eadbca",
    backgroundColor: "#fff7ef",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#7c6754",
  },
  deleteButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#ef6a57",
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  saveButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#ef7b39",
  },
  saveButtonDisabled: {
    backgroundColor: "#f3b081",
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
