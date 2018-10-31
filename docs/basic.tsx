import Component from '../src/index';
import * as React from 'react';

class Props {}

class State {}

export default class Page extends React.PureComponent<Props, State> {
  public static defaultProps = new Props();
  public state = new State();

  public render() {
    return <Component />;
  }
}
