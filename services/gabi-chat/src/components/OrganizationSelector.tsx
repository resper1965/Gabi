'use client';

import React, { useState, useEffect } from 'react';
import { authService, Organization } from '@/lib/auth';

interface OrganizationSelectorProps {
  onOrganizationChange?: (organization: Organization) => void;
}

export default function OrganizationSelector({ onOrganizationChange }: OrganizationSelectorProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setIsLoading(true);
      const orgs = await authService.getUserOrganizations();
      setOrganizations(orgs);
      
      const current = authService.getCurrentOrganization();
      setCurrentOrg(current);
    } catch (error) {
      console.error('Erro ao carregar organizações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrganizationSelect = async (organization: Organization) => {
    try {
      await authService.switchOrganization(organization.id);
      setCurrentOrg(organization);
      setIsOpen(false);
      onOrganizationChange?.(organization);
    } catch (error) {
      console.error('Erro ao trocar organização:', error);
    }
  };

  const handleCreateOrganization = async () => {
    const name = prompt('Nome da organização:');
    if (!name) return;

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const description = prompt('Descrição (opcional):');

    try {
      const newOrg = await authService.createOrganization(name, slug, description);
      setOrganizations(prev => [...prev, newOrg]);
      await handleOrganizationSelect(newOrg);
    } catch (error) {
      console.error('Erro ao criar organização:', error);
      alert('Erro ao criar organização');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        <span>Carregando organizações...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <span className="font-medium">
          {currentOrg ? currentOrg.name : 'Selecionar Organização'}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Organizações
            </div>
            
            {organizations.length === 0 ? (
              <div className="text-sm text-gray-500 py-2">
                Nenhuma organização encontrada
              </div>
            ) : (
              <div className="space-y-1">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleOrganizationSelect(org)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      currentOrg?.id === org.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{org.name}</div>
                    {org.description && (
                      <div className="text-xs text-gray-500 truncate">
                        {org.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-gray-200 mt-2 pt-2">
              <button
                onClick={handleCreateOrganization}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Criar Nova Organização</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
