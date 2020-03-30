
/* An abstract class for the "basic" views, as well as month view. Renders one or more rows of day cells.
----------------------------------------------------------------------------------------------------------------------*/
// It is a manager for a DayGrid subcomponent, which does most of the heavy lifting.
// It is responsible for managing width/height.

var ResourceView = FC.ResourceView = View.extend({

	scroller: null,

	dayNumbersVisible: true, // display day numbers

	resourceGroups: null, // record the resource group id and name
	dayGrids: [], // one dayGrid per each data group


	initialize: function() {
		if (!this.options.groupBy) {
			console.error('must specify groupBy option for Resource View');
		}
	
		this.scroller = new Scroller({
			overflowX: 'hidden',
			overflowY: 'auto'
		});
	},

	// Computes the date range that will be rendered.
	buildRenderRange: function(currentRange, currentRangeUnit) {
		var renderRange = View.prototype.buildRenderRange.apply(this, arguments);

		renderRange.end = renderRange.start.clone().add(1, 'month');

		return this.trimHiddenDays(renderRange);
	},


	// if dateProfile not specified, uses current
	executeDateRender: function(dateProfile, skipScroll) {	
		var view = this;

		view.setDateProfileForRendering(dateProfile);
		view.updateTitle();
		view.calendar.updateToolbarButtons();

		// Fetch the intial events
		var promise = this.fetchInitialEvents({
			activeRange: {
				start: view.renderRange.start,
				end: view.renderRange.end
			}
		});

		promise.then(function() {	
			if (this.render) {
				this.render(); // TODO: deprecate
			}
			
			view.renderDates();
			view.updateSize();
			view.renderBusinessHours(); // might need coordinates, so should go after updateSize()
			view.startNowIndicator();

			if (!skipScroll) {
				view.addScroll(view.computeInitialDateScroll());
			}

			view.isDatesRendered = true;
			view.trigger('datesRendered');
		});
	},


	// Renders the view into `this.el`, which should already be assigned
	renderDates: function() {
		var view = this;

		var events = view.get('currentEvents');

		var groupId = view.options.groupBy.id;
		var groupName = view.options.groupBy.name;

		view.resourceGroups = events.filter(function(event) {
			return event[groupId] && event[groupName];
		}).map(function(event) {
			return {
				id: event[groupId],
				name: event[groupName]
			};
		}).filter(function(thing, index, self) {
			ids = self.map(function(g) {
				return g.id;
			});
			return index === ids.indexOf(thing.id);
		})

		view.renderInGroups();
	},


	// Unrenders the content of the view. Since we haven't separated skeleton rendering from date rendering,
	// always completely kill the dayGrid's rendering.
	unrenderDates: function() {
		if (this.dayGrids && this.dayGrids.length > 0) {
			this.dayGrids.forEach(function(dayGrid) {
				dayGrid.unrenderDates();
				dayGrid.removeElement();
			});
		}

		this.scroller.destroy();
	},


	renderInGroups: function() {
		var view = this;
		this.buildResourceLayout();

		this.dayGrids = [];

		this.resourceGroups.forEach(function(group) {
			var subclass = DayGrid.extend(resourceDayGridMethods);
			var dayGrid  = new subclass(view);

			dayGrid.groupId = group.id;

			dayGrid.breakOnWeeks = false;
			dayGrid.numbersVisible = true;

			view.scroller.render();

			var groupDataContainerEl = view.el.find('[data-group-id="' + group.id + '"]');
			dayGrid.setElement(groupDataContainerEl);

			dayGrid.setRange(view.renderRange);
			dayGrid.renderDates(view.hasRigidRows());

			view.dayGrids.push(dayGrid);
		});

		this.renderHead();
		this.requestEventsRender(this.get('currentEvents'));
	},


	// render the day-of-week headers
	renderHead: function() {
		this.headContainerEl = this.el.find('.fc-head-container .fc-resource-head-group-data');
		if (this.dayGrids && this.dayGrids.length > 0) {
			this.headContainerEl.html(this.dayGrids[0].renderHeadHtml());
		}
		this.headRowEl = this.headContainerEl.find('.fc-row');
	},


	// Build the year layout
	buildResourceLayout: function() {
		// Get rid of the existing view
		this.el.empty();

		var resourceViewElem = '<div class="fc-resource-main-table">';

		resourceViewElem += '<div class="fc-resource-scrollable">';
		resourceViewElem += '<div class="fc-head-container">' 
			+ '<div class="fc-resource-head-group-label"></div>'
			+ '<div class="fc-resource-head-group-data"></div>'
			+ '</div>';

		this.resourceGroups.forEach(function(group) {
			resourceViewElem += '<div class="fc-resource-group">'
			+ '<div class="fc-resource-group-label">'
			+ group.name
			+ '</div>'
			+ '<div class="fc-resource-group-data" data-group-id="' + group.id + '"></div>'
			+ '</div>';
		});

		resourceViewElem += '</div>';
		resourceViewElem += '</div>';

		$(resourceViewElem).appendTo(this.el);
	},


	// Determines whether each row should have a constant height
	hasRigidRows: function() {
		var eventLimit = this.opt('eventLimit');
		return eventLimit && typeof eventLimit !== 'number';
	},


	/* Events
	------------------------------------------------------------------------------------------------------------------*/


	// Renders the given events onto the view and populates the segments array
	renderEvents: function(events) {
		var view = this;

		var groupId = view.options.groupBy.id;

		this.dayGrids.forEach(function(dayGrid) {
			// Only display events that in the dayGrid's group
			var groupedEvents = events.filter(function(event) {
				return event[groupId] === dayGrid.groupId;
			});
			dayGrid.renderEvents(groupedEvents);
		});

		view.updateHeight(); // must compensate for events that overflow the row
	},


	// Unrenders all event elements and clears internal segment data
	unrenderEvents: function() {
		this.dayGrids.forEach(function(dayGrid) {
			dayGrid.unrenderEvents();
		});
	},
});


// Methods that will customize the rendering behavior of the ResourceView's dayGrid
var resourceDayGridMethods = {
	// Generates the HTML that will go before the day-of week header cells
	renderHeadIntroHtml: function() {
		var view = this.view;

		if (view.colWeekNumbersVisible) {
			return '' +
				'<th class="fc-week-number ' + view.widgetHeaderClass + '" ' + view.weekNumberStyleAttr() + '>' +
					'<span>' + // needed for matchCellWidths
						htmlEscape(view.opt('weekNumberTitle')) +
					'</span>' +
				'</th>';
		}

		return '';
	},


	// Generates the HTML that will go before content-skeleton cells that display the day/week numbers
	renderNumberIntroHtml: function(row) {
		var view = this.view;
		var weekStart = this.getCellDate(row, 0);

		if (view.colWeekNumbersVisible) {
			return '' +
				'<td class="fc-week-number" ' + view.weekNumberStyleAttr() + '>' +
					view.buildGotoAnchorHtml( // aside from link, important for matchCellWidths
						{ date: weekStart, type: 'week', forceOff: this.colCnt === 1 },
						weekStart.format('w') // inner HTML
					) +
				'</td>';
		}

		return '';
	},


	// Generates the HTML that goes before the day bg cells for each day-row
	renderBgIntroHtml: function() {
		var view = this.view;

		if (view.colWeekNumbersVisible) {
			return '<td class="fc-week-number ' + view.widgetContentClass + '" ' +
				view.weekNumberStyleAttr() + '></td>';
		}

		return '';
	},


	// Generates the HTML that goes before every other type of row generated by DayGrid.
	// Affects helper-skeleton and highlight-skeleton rows.
	renderIntroHtml: function() {
		var view = this.view;

		if (view.colWeekNumbersVisible) {
			return '<td class="fc-week-number" ' + view.weekNumberStyleAttr() + '></td>';
		}

		return '';
	}

};
