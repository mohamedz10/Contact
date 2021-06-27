package com.genesis.contact.service;

import com.genesis.contact.model.Company;
import com.genesis.contact.model.Contact;
import com.genesis.contact.repository.CompanyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class CompanyService {

    private final CompanyRepository companyRepository;

    @Autowired
    public CompanyService(CompanyRepository companyRepository) {
        this.companyRepository = companyRepository;
        this.companyRepository.setClazz(Company.class);
    }

    public Company getCompany(Long id) {
        return companyRepository.get(id);
    }

    public Company saveCompany(Company company) {
        return companyRepository.save(company);
    }

    public boolean deleteCompany(Long id) {
        try {
            companyRepository.deleteById(id);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public Company updateCompany(Company company) {
        return companyRepository.update(company);
    }

    public Company addContact(Long companyId, Long contactId) {
        return companyRepository.addContract(companyId, contactId);
    }
}
