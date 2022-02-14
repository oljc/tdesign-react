import { useEffect, useCallback, RefObject } from 'react';
import useConfig from './useConfig';
import setStyle from './setStyle';
import { canUseDocument } from './dom';

const period = 200;
const noneRippleBg = 'rgba(0, 0, 0, 0)';
const defaultRippleColor = 'rgba(0, 0, 0, 0.35)';

// 设置动画颜色 get the ripple animation color
const getRippleColor = (el: HTMLElement, fixedRippleColor?: string) => {
  // get fixed color from params
  if (fixedRippleColor) {
    return fixedRippleColor;
  }
  // get dynamic color from the dataset
  if (el?.dataset?.ripple) {
    const rippleColor = el.dataset.ripple;
    return rippleColor;
  }
  // use css variable
  const cssVariable = getComputedStyle(el).getPropertyValue('--ripple-color');
  if (cssVariable) {
    return cssVariable;
  }
  return defaultRippleColor;
};

/**
 * 斜八角动画hooks 支持三种方式使用
 * 1. fixedRippleColor 固定色值 useRipple(ref,fixedRippleColor);
 * 2. dynamicColor 动态色值 data.ripple="rippleColor" useRipple(ref)
 * 3. CSS variables（recommended） 配合节点对应CSS设置 --ripple-color useRipple(ref)
 * @param ref 需要使用斜八角动画的DOM
 * @param fixedRippleColor 斜八角的动画颜色
 */
export default function useRipple(ref: RefObject<HTMLElement>, fixedRippleColor?: string): void {
  const { classPrefix } = useConfig();

  // TODO: insekkei recover
  const rippleContainer = canUseDocument ? document.createElement('div') : null;
  // 为节点添加斜八角动画 add ripple to the DOM and set up the animation
  const handleAddRipple = useCallback(
    (e) => {
      const el = ref?.current;
      const rippleColor = getRippleColor(el, fixedRippleColor);

      if (e.button !== 0 || !el) return;

      if (
        el.classList.contains(`${classPrefix}-is-active`) ||
        el.classList.contains(`${classPrefix}-is-disabled`) ||
        el.classList.contains(`${classPrefix}-is-checked`)
      )
        return;

      const elStyle = getComputedStyle(el);

      const elBorder = parseInt(elStyle.borderWidth, 10);
      const border = elBorder > 0 ? elBorder : 0;
      const width = el.offsetWidth;
      const height = el.offsetHeight;

      if (rippleContainer.parentNode === null) {
        setStyle(rippleContainer, {
          position: 'absolute',
          left: `${0 - border}px`,
          top: `${0 - border}px`,
          width: `${width}px`,
          height: `${height}px`,
          borderRadius: elStyle.borderRadius,
          pointerEvents: 'none',
          overflow: 'hidden',
        });
        el.appendChild(rippleContainer);
      }
      // 新增一个ripple
      const ripple = document.createElement('div');

      setStyle(ripple, {
        marginTop: '0',
        marginLeft: '0',
        right: `${width}px`,
        width: `${width + 20}px`,
        height: '100%',
        transition: `transform ${period}ms cubic-bezier(.38, 0, .24, 1), background ${period * 2}ms linear`,
        transform: 'skewX(-8deg)',
        pointerEvents: 'none',
        position: 'absolute',
        zIndex: 0,
        backgroundColor: rippleColor,
        opacity: '0.9',
      });

      // fix zIndex：避免遮盖内部元素
      const elMap = new WeakMap();
      for (let n = el.children.length, i = 0; i < n; ++i) {
        const child = el.children[i];
        if ((child as HTMLElement).style.zIndex === '' && child !== rippleContainer) {
          (child as HTMLElement).style.zIndex = '1';
          elMap.set(child, true);
        }
      }

      // fix position
      const initPosition = el.style.position ? el.style.position : getComputedStyle(el).position;
      if (initPosition === '' || initPosition === 'static') {
        // eslint-disable-next-line no-param-reassign
        el.style.position = 'relative';
      }
      rippleContainer.insertBefore(ripple, rippleContainer.firstChild);

      setTimeout(() => {
        ripple.style.transform = `translateX(${width}px)`;
      }, 0);
      // 清除动画节点 clear ripple container
      const handleClearRipple = () => {
        const el = ref?.current;
        ripple.style.backgroundColor = noneRippleBg;

        if (!el) return;

        el.removeEventListener('pointerup', handleClearRipple, false);
        el.removeEventListener('pointerleave', handleClearRipple, false);

        setTimeout(() => {
          ripple.remove();
          if (rippleContainer.children.length === 0) rippleContainer.remove();
        }, period * 2 + 100);
      };
      el.addEventListener('pointerup', handleClearRipple, false);
      el.addEventListener('pointerleave', handleClearRipple, false);
    },
    [classPrefix, ref, fixedRippleColor, rippleContainer],
  );

  // 重置一些属性 为动画做准备 reset the node which uses the ripple animation
  const initRippleElement = useCallback(() => {
    const el = ref?.current;

    if (!el) return;

    const initPosition = el.style?.position || getComputedStyle(el).position;
    if (['', 'static'].includes(initPosition)) {
      el.style.position = 'relative';
    }
  }, [ref]);

  useEffect(() => {
    const el = ref?.current;
    if (!el) return;

    initRippleElement();

    el.addEventListener('pointerdown', handleAddRipple, false);

    return () => {
      el.removeEventListener('pointerdown', handleAddRipple, false);
    };
  }, [initRippleElement, handleAddRipple, fixedRippleColor, ref]);
}
