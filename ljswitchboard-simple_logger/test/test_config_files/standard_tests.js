
exports.configurations = [
{
	'fileName': 'basic_config.json',
	'filePath': '',
	'data': undefined,
	'core_period': 0,
	'dataGroups': [],
	'managers': [],
	'results': [],

	'requestedDeviceDataPattern': [{
		'1': ['AIN0'],
		'2': ['AIN0']
	}],
	'extraRequestedDeviceDataPattern':[{
		'1': ['AIN0'],
		'2': ['AIN0']
	}],

	'reportedDataGroupsPattern': [
		['basic_data_group']
	],
	'extraReportedDataGroupsPattern':[],

	'collectedGroupDataPattern': [{
		'basic_data_group': {'1': ['AIN0'], '2': ['AIN0']},
	}],
	'extraCollectedGroupDataPattern':[],
	'numExpectedPatterns': 4,

	'stopCases': {
		'basic_data_group': 4,
	}
},
{
	'fileName': 'two_data_groups.json',
	'filePath': '',
	'data': undefined,
	'core_period': 0,
	'dataGroups': [],
	'managers': [],
	'results': [],

	'requestedDeviceDataPattern': [{
		'1': ['AIN0','AIN1'],
		'2': ['AIN0']
	},{
		'1': ['AIN1'],
	}],
	'extraRequestedDeviceDataPattern':[{
		'1': ['AIN0','AIN1'],
		'2': ['AIN0']
	}],

	'reportedDataGroupsPattern': [
		['secondary_data_group'],
		['basic_data_group', 'secondary_data_group']
	],
	'extraReportedDataGroupsPattern':[],

	'collectedGroupDataPattern': [{
		'secondary_data_group': {'1': ['AIN1']}
	},{
		'basic_data_group': {'1': ['AIN0'], '2': ['AIN0']},
		'secondary_data_group': {'1': ['AIN1']}
	}],
	'extraCollectedGroupDataPattern':[],

	'numExpectedPatterns': 4,
	'stopCases': {
		'basic_data_group': 4,
		'secondary_data_group': 8,
	}
},
{
	'fileName': 'two_data_groups_adv.json',
	'filePath': '',
	'data': undefined,
	'core_period': 0,
	'dataGroups': [],
	'managers': [],
	'results': [],

	'requestedDeviceDataPattern': [{
		'1': ['AIN0','AIN1','AIN2'],
		'2': ['AIN0']
	},{
		'1': ['AIN1'],
	}],
	'extraRequestedDeviceDataPattern':[{
		'1': ['AIN0','AIN1','AIN2'],
		'2': ['AIN0']
	}],

	'reportedDataGroupsPattern': [
		['secondary_data_group'],
		['basic_data_group', 'secondary_data_group']
	],
	'extraReportedDataGroupsPattern':[],

	'collectedGroupDataPattern': [{
		'secondary_data_group': {'1': ['AIN1']}
	},{
		'basic_data_group': {'1': ['AIN0','AIN1','AIN2'], '2': ['AIN0']},
		'secondary_data_group': {'1': ['AIN1']}
	}],
	'extraCollectedGroupDataPattern':[],

	'numExpectedPatterns': 4,
	'stopCases': {
		'basic_data_group': 4,
		'secondary_data_group': 8,
	}
}];