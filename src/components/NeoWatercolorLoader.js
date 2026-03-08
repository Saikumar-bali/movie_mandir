import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle, Path, Rect } from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withRepeat, 
  withTiming, 
  Easing,
  useAnimatedStyle,
  withDelay
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const NeoWatercolorLoader = ({ onAnimationEnd }) => {
  // Animation values for blobs
  const scale1 = useSharedValue(1);
  const opacity1 = useSharedValue(0.7);
  const scale2 = useSharedValue(1);
  const opacity2 = useSharedValue(0.6);
  const scale3 = useSharedValue(1);
  const opacity3 = useSharedValue(0.5);
  
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    // Blob 1 Animation (Breathing)
    scale1.value = withRepeat(
      withTiming(1.5, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    opacity1.value = withRepeat(
      withTiming(0.4, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Blob 2 Animation (Delayed)
    scale2.value = withDelay(1000, withRepeat(
      withTiming(1.6, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    ));
    opacity2.value = withDelay(1000, withRepeat(
      withTiming(0.3, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    ));

    // Blob 3 Animation
    scale3.value = withDelay(2000, withRepeat(
      withTiming(1.4, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    ));
    opacity3.value = withDelay(2000, withRepeat(
      withTiming(0.3, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    ));

    // Text Fade In
    textOpacity.value = withTiming(1, { duration: 2000 });

    // Simulate loading time if onAnimationEnd provided, or just let it run
    if (onAnimationEnd) {
       const timer = setTimeout(() => {
         onAnimationEnd();
       }, 5000); // 5 seconds loading simulation
       return () => clearTimeout(timer);
    }
  }, []);

  const animatedProps1 = useAnimatedProps(() => ({
    r: 100 * scale1.value,
    opacity: opacity1.value,
  }));

  const animatedProps2 = useAnimatedProps(() => ({
    r: 120 * scale2.value,
    opacity: opacity2.value,
  }));

  const animatedProps3 = useAnimatedProps(() => ({
    r: 80 * scale3.value,
    opacity: opacity3.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Svg height={height} width={width} style={styles.svg}>
        <Defs>
          <RadialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor="#FF9A9E" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FECFEF" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="grad2" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor="#a18cd1" stopOpacity="1" />
            <Stop offset="100%" stopColor="#fbc2eb" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="grad3" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor="#84fab0" stopOpacity="1" />
            <Stop offset="100%" stopColor="#8fd3f4" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Background Wash */}
        <Rect x="0" y="0" width={width} height={height} fill="#fff" />

        {/* Organic Blobs */}
        <AnimatedCircle
          cx={width * 0.3}
          cy={height * 0.3}
          fill="url(#grad1)"
          animatedProps={animatedProps1}
        />
        <AnimatedCircle
          cx={width * 0.7}
          cy={height * 0.6}
          fill="url(#grad2)"
          animatedProps={animatedProps2}
        />
        <AnimatedCircle
          cx={width * 0.5}
          cy={height * 0.5}
          fill="url(#grad3)"
          animatedProps={animatedProps3}
        />
        
        {/* Additional aesthetic decorations could go here */}
      </Svg>

      <View style={styles.contentContainer}>
        <Animated.View style={[styles.textWrapper, textStyle]}>
          <Text style={styles.title}>Movie Mandir</Text>
          <Text style={styles.subtitle}>Cinematic Experience</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // Ensure it's on top
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  contentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  textWrapper: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)', // Glassmorphism-ish
    padding: 20,
    borderRadius: 20,
    // backdropFilter: 'blur(10px)', // removed as it is not supported in RN
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#333',
    letterSpacing: 2,
    fontFamily: 'System', // Use default pleasing font
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
    letterSpacing: 1,
    fontWeight: '500',
  }
});

export default NeoWatercolorLoader;
