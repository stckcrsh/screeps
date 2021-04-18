import { Agent } from './agent';
import { Machine, transition } from './machine';

const noop = (agent: Agent): void => {
	console.log(`No state found for Agent: ${agent.name}`);
};

export function Actions<T extends string, U extends string>(
	this: any,
	machine: Machine<T, U>
) {
	// this is the decorator factory, it sets up
	// the returned decorator function
	return function(
		this: any,
		target: any,
		propertyKey: string,
		descriptor: PropertyDescriptor
	) {
		const method = descriptor.value;

		descriptor.value = function(agent: Agent) {
			if (!agent.getState()) {
				agent.setState(machine.initialState);
			}

			if (agent.getEvent()) {
				agent.removeEvent();
				agent.setState(
					transition(machine, agent.getState()!, agent.getEvent())
				);
			}

			const dispatch = (event: U) => {
				agent.say(event);
				agent.setState(transition(machine, agent.getState()!, event));
			};

			const states = method.apply(this, [agent]);

			const state: any = agent.getState();
			if (state) {
				states[state as T].apply(this, [dispatch]);
			} else {
				noop(agent);
			}
		};

		descriptor.value.bind(this);

		return descriptor;
	};
}
