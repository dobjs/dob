import * as React from "react"
import { connect } from "react-redux"
import { bindActionCreators } from "redux"
import Header from "../components/header"
import MainSection from "../components/main-section"
import { actions } from "../stores"

const App = (props: any) => (
  <div>
    <Header addTodoTask={actions.todo.addTodoTask} />
    <MainSection todos={props.todos} actions={actions.todo} />
  </div>
)

const mapStateToProps = (state: any) => ({
  todos: state.todo.todos
})

const mapDispatchToProps = (dispatch: any) => ({
  actions: actions.todo
})

export default connect(mapStateToProps, mapDispatchToProps)(App)
