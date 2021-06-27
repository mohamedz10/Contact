package com.genesis.contact.controller;

import com.genesis.contact.model.Company;
import com.genesis.contact.model.Contact;
import com.genesis.contact.service.CompanyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/company")
public class CompanyController {

    private CompanyService companyService;

    @Autowired
    public CompanyController(CompanyService companyService) {
        this.companyService = companyService;
    }

    @GetMapping("/company")
    public ResponseEntity<Company> getCompanyById(
            @RequestParam Long companyId
    ) {
        try {
            Company company = companyService.getCompany(companyId);
            return new ResponseEntity<>(company, company != null ? HttpStatus.OK : HttpStatus.NO_CONTENT);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/company")
    public ResponseEntity<Company> createCompany(
            @RequestBody Company newCompany
    ) {
        try {
            Company companySaved = companyService.saveCompany(newCompany);
            return new ResponseEntity<>(companySaved, HttpStatus.OK);

        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @DeleteMapping("/company")
    public ResponseEntity<Boolean> deleteCompany(
            @RequestParam Long companyId
    ) {
        try {
            Boolean deleted = companyService.deleteCompany(companyId);
            return new ResponseEntity<>(deleted, deleted ? HttpStatus.OK : HttpStatus.NOT_FOUND);

        } catch (Exception e) {
            return new ResponseEntity<>(false, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PutMapping("/company")
    public ResponseEntity<Company> updateCompany(
            @RequestBody Company companyToUpdate
    ) {
        try {
            Company companyUpdated = companyService.updateCompany(companyToUpdate);
            return new ResponseEntity<>(companyUpdated, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    @PutMapping("/addContact")
    public ResponseEntity<Company> addContactToCompany(
            @RequestParam Long companyId,
            @RequestParam Long contactId

    ){
        try {
            Company companyUpdated = companyService.addContact(companyId, contactId);
            return new ResponseEntity<>(companyUpdated, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }


}
