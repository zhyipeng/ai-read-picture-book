import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  PanGestureHandler,
  PinchGestureHandler,
  State,
  TapGestureHandler,
} from "react-native-gesture-handler";

type ExpoImageProps = ComponentProps<typeof ExpoImage>;

type PreviewImageProps = Omit<ExpoImageProps, "style"> & {
  style?: ExpoImageProps["style"];
  previewEnabled?: boolean;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2;

function clampScale(value: number): number {
  return Math.min(Math.max(value, MIN_SCALE), MAX_SCALE);
}

function getPreviewUri(source: ExpoImageProps["source"]): string | null {
  if (typeof source === "string") {
    return source;
  }

  if (Array.isArray(source)) {
    const firstSource = source[0];

    if (firstSource && typeof firstSource === "object" && "uri" in firstSource) {
      return typeof firstSource.uri === "string" ? firstSource.uri : null;
    }

    return null;
  }

  if (source && typeof source === "object" && "uri" in source) {
    return typeof source.uri === "string" ? source.uri : null;
  }

  return null;
}

export function PreviewImage({
  source,
  style,
  previewEnabled = true,
  contentFit,
  ...restProps
}: PreviewImageProps) {
  const previewUri = useMemo(() => getPreviewUri(source), [source]);
  const [visible, setVisible] = useState(false);
  const { width, height } = useWindowDimensions();
  const imageViewportWidth = Math.max(width - 24, 200);
  const imageViewportHeight = Math.max(height - 160, 240);
  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const panOffsetX = useRef(new Animated.Value(0)).current;
  const panOffsetY = useRef(new Animated.Value(0)).current;
  const accumulatedScaleRef = useRef(1);
  const accumulatedPanRef = useRef({ x: 0, y: 0 });
  const currentScaleRef = useRef(1);

  const scale = useMemo(
    () => Animated.multiply(baseScale, pinchScale),
    [baseScale, pinchScale]
  );
  const translateX = useMemo(() => Animated.add(panOffsetX, panX), [panOffsetX, panX]);
  const translateY = useMemo(() => Animated.add(panOffsetY, panY), [panOffsetY, panY]);

  useEffect(() => {
    const scaleListener = scale.addListener(({ value }) => {
      currentScaleRef.current = value;
    });

    return () => {
      scale.removeListener(scaleListener);
    };
  }, [scale]);

  function resetTransform() {
    accumulatedScaleRef.current = 1;
    accumulatedPanRef.current = { x: 0, y: 0 };
    currentScaleRef.current = 1;
    baseScale.setValue(1);
    pinchScale.setValue(1);
    panX.setValue(0);
    panY.setValue(0);
    panOffsetX.setValue(0);
    panOffsetY.setValue(0);
  }

  function handleOpen() {
    if (!previewEnabled || !previewUri) {
      return;
    }

    resetTransform();
    setVisible(true);
  }

  function handleClose() {
    setVisible(false);
    resetTransform();
  }

  function handlePinchStateChange(event: {
    nativeEvent: { oldState: State; scale: number };
  }) {
    if (event.nativeEvent.oldState !== State.ACTIVE) {
      return;
    }

    const nextScale = clampScale(
      accumulatedScaleRef.current * event.nativeEvent.scale
    );

    accumulatedScaleRef.current = nextScale;
    currentScaleRef.current = nextScale;
    baseScale.setValue(nextScale);
    pinchScale.setValue(1);

    if (nextScale <= MIN_SCALE) {
      accumulatedPanRef.current = { x: 0, y: 0 };
      panOffsetX.setValue(0);
      panOffsetY.setValue(0);
      panX.setValue(0);
      panY.setValue(0);
    }
  }

  function handlePanStateChange(event: {
    nativeEvent: {
      oldState: State;
      translationX: number;
      translationY: number;
    };
  }) {
    if (event.nativeEvent.oldState !== State.ACTIVE) {
      return;
    }

    if (currentScaleRef.current <= MIN_SCALE) {
      panOffsetX.setValue(0);
      panOffsetY.setValue(0);
      panX.setValue(0);
      panY.setValue(0);
      accumulatedPanRef.current = { x: 0, y: 0 };
      return;
    }

    const nextX = accumulatedPanRef.current.x + event.nativeEvent.translationX;
    const nextY = accumulatedPanRef.current.y + event.nativeEvent.translationY;

    accumulatedPanRef.current = {
      x: nextX,
      y: nextY,
    };
    panOffsetX.setValue(nextX);
    panOffsetY.setValue(nextY);
    panX.setValue(0);
    panY.setValue(0);
  }

  function handleDoubleTap() {
    const nextScale =
      currentScaleRef.current > MIN_SCALE ? MIN_SCALE : DOUBLE_TAP_SCALE;

    accumulatedScaleRef.current = nextScale;
    currentScaleRef.current = nextScale;
    baseScale.setValue(nextScale);
    pinchScale.setValue(1);

    if (nextScale === MIN_SCALE) {
      accumulatedPanRef.current = { x: 0, y: 0 };
      panOffsetX.setValue(0);
      panOffsetY.setValue(0);
      panX.setValue(0);
      panY.setValue(0);
    }
  }

  if (!previewEnabled || !previewUri) {
    return (
      <ExpoImage
        source={source}
        style={style}
        contentFit={contentFit}
        {...restProps}
      />
    );
  }

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          style,
          styles.thumbnailButton,
          pressed ? styles.thumbnailButtonPressed : null,
        ]}
        onPress={(event) => {
          event.stopPropagation();
          handleOpen();
        }}
      >
        <ExpoImage
          source={source}
          style={styles.thumbnailImage}
          contentFit={contentFit}
          {...restProps}
        />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            <TapGestureHandler numberOfTaps={2} onActivated={handleDoubleTap}>
              <Animated.View collapsable={false}>
                <PanGestureHandler
                  enabled={visible}
                  onGestureEvent={Animated.event(
                    [{ nativeEvent: { translationX: panX, translationY: panY } }],
                    { useNativeDriver: true }
                  )}
                  onHandlerStateChange={handlePanStateChange}
                  minPointers={1}
                  maxPointers={2}
                >
                  <Animated.View collapsable={false}>
                    <PinchGestureHandler
                      onGestureEvent={Animated.event(
                        [{ nativeEvent: { scale: pinchScale } }],
                        { useNativeDriver: true }
                      )}
                      onHandlerStateChange={handlePinchStateChange}
                    >
                      <Animated.View
                        style={[
                          styles.viewerFrame,
                          {
                            width: imageViewportWidth,
                            height: imageViewportHeight,
                            transform: [{ translateX }, { translateY }, { scale }],
                          },
                        ]}
                      >
                        <ExpoImage
                          source={source}
                          style={styles.viewerImage}
                          contentFit="contain"
                          {...restProps}
                        />
                      </Animated.View>
                    </PinchGestureHandler>
                  </Animated.View>
                </PanGestureHandler>
              </Animated.View>
            </TapGestureHandler>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thumbnailButton: {
    overflow: "hidden",
  },
  thumbnailButtonPressed: {
    opacity: 0.92,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(8, 8, 10, 0.96)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  modalHint: {
    flex: 1,
    color: "rgba(255, 255, 255, 0.72)",
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  modalContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 28,
  },
  viewerFrame: {
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: {
    width: "100%",
    height: "100%",
  },
});
