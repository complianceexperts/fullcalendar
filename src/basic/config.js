
fcViews.basic = {
	'class': BasicView
};

fcViews.basicDay = {
	type: 'basic',
	duration: { days: 1 }
};

fcViews.basicWeek = {
	type: 'basic',
	duration: { weeks: 1 }
};

fcViews.month = {
	'class': MonthView,
	duration: { months: 1 }, // important for prev/next
	defaults: {
		fixedWeekCount: true
	}
};

fcViews.year = {
	'class': YearView,
	duration: { year: 1 },
	defaults: {
		fixedWeekCount: true
	}
};

fcViews.resource = {
	'class': ResourceView,
	duration: { weeks: 4 }
};