/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
export type CreateTypeFromInterface<Interface> = {
  [Property in keyof Interface]: Interface[Property];
};

export function debounce<F extends (...args: any[]) => void>(f: F, delay: number) {
  let timer: NodeJS.Timeout;
  return (...args: any[]) => {
    timer && clearTimeout(timer);
    timer = setTimeout(f, delay, ...args);
  };
}
