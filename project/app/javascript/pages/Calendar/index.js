import React from 'react'
import { compose, graphql } from 'react-apollo'
import { NetworkStatus } from 'apollo-client'
import { connect } from 'react-redux'
import R from 'ramda'
import moment from 'moment'

import { togglePopover, changeShowFilter, changeEventFilter, changeOfficeFilter, calendarDateChange } from 'actions'

import Calendar from 'components/Calendar'
import EventPopover from 'components/EventPopover'

import EventsQuery from './query.gql'
import EventQuery from './eventQuery.gql'
import FetchMoreQuery from './fetchMoreQuery.gql'
import CreateSignupMutation from 'mutations/CreateSignupMutation.gql'
import DestroySignupMutation from 'mutations/DestroySignupMutation.gql'

const fetchMoreEvents = (fetchMore, calendarDateChange, currentDate, newDate, scope) => {
  const startOfNewScope = moment(newDate).startOf(scope)

  const startOfNextScope =
    newDate > currentDate ? startOfNewScope.add(1, `${scope}s`) : startOfNewScope.subtract(1, `${scope}s`)

  const after = Number(startOfNewScope.format('X'))
  const before = Number(startOfNewScope.endOf(scope).format('X'))

  fetchMore({
    query: FetchMoreQuery,
    variables: { after, before },
    updateQuery: (previousResult, { fetchMoreResult }) => {
      if (!fetchMoreResult) {
        return previousResult
      }

      const existing = new Set(previousResult.events)

      R.forEach(e => existing.add(e), fetchMoreResult.events)

      return R.merge(previousResult, { events: [...existing] })
    },
  })

  calendarDateChange(newDate)

  return newDate
}

const EventPopoverForData = props => {
  const {
    popoverState,
    currentUser,
    onPopoverClose,
    createSignup,
    destroySignup,
    data: { networkStatus, event },
  } = props

  return (
    <EventPopover
      loading={networkStatus === NetworkStatus.loading}
      open
      anchorEl={popoverState.anchorEl}
      currentUser={currentUser}
      event={event}
      onPopoverClose={onPopoverClose}
      createSignupHandler={() => createSignup(event, currentUser)}
      destroySignupHandler={() => destroySignup(event, currentUser)}
    />
  )
}

const connectEventPopoverToData = graphql(EventQuery, {
  options: ({ popoverState: { data: { id } } }) => ({
    variables: {
      id: id,
    },
  }),
})

const EventPopoverWithData = connectEventPopoverToData(EventPopoverForData)

const CalendarPage = ({
  data: { networkStatus, fetchMore, currentUser, events, offices },
  locationBeforeTransitions,
  filters,
  eventPopover,
  togglePopover,
  changeShowFilter,
  changeEventFilter,
  changeOfficeFilter,
  createSignup,
  destroySignup,
  calendarDateChange,
  calendarDate,
}) => (
  <div>
    <Calendar
      loading={networkStatus === NetworkStatus.loading}
      currentPath={locationBeforeTransitions.pathname}
      events={events}
      offices={offices}
      currentUser={currentUser}
      filters={filters}
      changeShowFilter={changeShowFilter}
      changeEventFilter={changeEventFilter}
      changeOfficeFilter={changeOfficeFilter}
      eventPopover={eventPopover}
      togglePopover={togglePopover}
      createSignup={createSignup}
      destroySignup={destroySignup}
      loadMoreEvents={R.partial(fetchMoreEvents, [fetchMore, calendarDateChange, calendarDate])}
    />
    {eventPopover ? (
      <EventPopoverWithData
        currentUser={currentUser}
        popoverState={eventPopover}
        onPopoverClose={togglePopover}
        createSignup={createSignup}
        destroySignup={destroySignup}
      />
    ) : null}
  </div>
)

const mapStateToProps = (state, ownProps) => {
  const { showFilter, eventFilter, officeFilter, popover, calendarDate } = state.model
  const { locationBeforeTransitions } = state.routing

  return {
    filters: {
      showFilter,
      eventFilter,
      officeFilter,
    },
    eventPopover: popover && popover.type === 'event' ? popover : null,
    calendarDate,
    locationBeforeTransitions,
  }
}

const momentAfter = Number(
  moment()
    .subtract(1, 'months')
    .startOf('month')
    .format('X')
)

const momentBefore = Number(
  moment()
    .add(1, 'months')
    .endOf('month')
    .format('X')
)

const updateEventsCache = (cache, eventChange, officeId) => {
  const variables = {
    after: momentAfter,
    before: momentBefore,
    officeId: officeId || 'current',
  }

  const prevCache = cache.readQuery({ query: EventsQuery, variables })

  const update = {
    ...prevCache,
    events: [
      ...prevCache.events.filter(event => event.id != eventChange.id),
      {
        ...prevCache.events.find(event => event.id == eventChange.id),
        users: eventChange.users,
        signupCount: eventChange.users.length,
      },
    ],
  }
  cache.writeQuery({ query: EventsQuery, variables, data: update })
}

const withData = compose(
  graphql(EventsQuery, {
    options: ({ filters: { officeFilter: { value: officeId } } }) => ({
      variables: {
        after: momentAfter,
        before: momentBefore,
        officeId: officeId || 'current',
      },
      fetchPolicy: 'cache-and-network',
    }),
  }),
  graphql(CreateSignupMutation, {
    props: ({ ownProps, mutate }) => ({
      createSignup: (event, currentUser) =>
        mutate({
          variables: { eventId: event.id },
          optimisticResponse: {
            __typename: 'Mutation',
            createSignup: {
              __typename: 'Signup',
              event: R.merge(event, {
                users: R.append(currentUser, event.users),
              }),
            },
          },
          update: (cache, { data: { createSignup: { event: eventChange } } }) => {
            updateEventsCache(cache, eventChange, ownProps.filters.officeFilter.value)
          },
        }),
    }),
  }),
  graphql(DestroySignupMutation, {
    props: ({ ownProps, mutate }) => ({
      destroySignup: (event, currentUser) =>
        mutate({
          variables: { eventId: event.id, userId: currentUser.id },
          optimisticResponse: {
            __typename: 'Mutation',
            destroySignup: {
              __typename: 'Signup',
              event: R.merge(event, {
                users: R.reject(u => u.id === currentUser.id, event.users),
              }),
            },
          },
          update: (cache, { data: { destroySignup: { event: eventChange } } }) => {
            updateEventsCache(cache, eventChange, ownProps.filters.officeFilter.value)
          },
        }),
    }),
  })
)

const withActions = connect(mapStateToProps, {
  togglePopover,
  changeShowFilter,
  changeEventFilter,
  changeOfficeFilter,
  calendarDateChange,
})

export default withActions(withData(CalendarPage))
