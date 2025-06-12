            <div>
              <label htmlFor="budgetCategory" className="block text-sm font-medium text-gray-700">Categoría del Proyecto</label>
              <select
                id="budgetCategory"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={newBudgetCategory}
                onChange={(e) => setNewBudgetCategory(e.target.value)}
              >
                <option value="">Seleccione una categoría</option>
                <option value="Obra Civil">Obra Civil</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Tecnología">Tecnología</option>
                <option value="Instalaciones">Instalaciones eléctricas</option>
              </select>
            </div>