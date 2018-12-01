import * as React from 'react';
import { observable, observe } from '../src/index';

export default () => <div />;

const obj = observable({ a: 1 });

observe(() => {
  // tslint:disable-next-line:no-console
  console.log('obj.a has changed to', obj.a);
}); // <· obj.a has changed to 1

obj.a = 2; // <· obj.a has changed to 2
