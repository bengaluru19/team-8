module OfficeResolver
  NAME_DESC = 'NAME_DESC'.freeze
  NAME_ASC = 'NAME_ASC'.freeze

  class << self
    def all(_object, args, context)
      scope = Office.all

      scope = scope_with_sort_by(scope, args[:sort_by])

      scope
    end

    def create(_, args, context)
      office = Office.new(args[:input].to_h)
      office.save!

      office
    end

    def update(_, args, context)
      office = Office.find(args[:input].id)
      office.update_attributes!(args[:input].to_h.except(:id))

      office
    end

    def delete(_, args, context)
      office = Office.find(args[:id])
      office.destroy!

      office
    end

    def scope_with_sort_by(scope, sort_by)
      return scope unless sort_by

      query_string = case sort_by
      when NAME_DESC
        'name DESC'
      when NAME_ASC
        'name ASC'
      end

      scope.order(query_string)
    end
  end
end
