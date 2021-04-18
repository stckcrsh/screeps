export interface Machine<States extends string, Events extends string> {
	initialState: States;
	states: Record<States, StateNode<States, Events>>;
}

export interface StateNode<States extends string, Events extends string> {
	events: Partial<Record<Events, States>>;
}

export function transition<State extends string, Event extends string>(
	machine: Machine<State, Event>,
	state: State,
	event: Event
): State {
	return _.get<Machine<any, any>, State>(
		machine,
		['states', state, 'events', event],
		state
	);
}
